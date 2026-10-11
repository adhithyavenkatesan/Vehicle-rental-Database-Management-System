const express = require('express');
const { all, get, run, transaction, logAudit } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/approvals
 * List approvals queue with optional status filtering
 */
router.get('/', authenticate, authorize(['ADMIN', 'STAFF']), (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT a.*,
             u_req.full_name as requester_name, u_req.email as requester_email,
             u_rev.full_name as reviewer_name
      FROM approvals a
      JOIN users u_req ON a.requested_by_user_id = u_req.id
      LEFT JOIN users u_rev ON a.reviewed_by_user_id = u_rev.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status.toUpperCase());
    }

    sql += " ORDER BY CASE WHEN a.status = 'PENDING' THEN 0 ELSE 1 END, a.created_at DESC";

    const approvals = all(sql, params).map(app => ({
      ...app,
      request_details: typeof app.request_details === 'string' ? JSON.parse(app.request_details || '{}') : app.request_details
    }));

    res.json({ success: true, count: approvals.length, approvals });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/approvals/:id/review
 * Approve or Reject an operational request (Admin only)
 */
router.post('/:id/review', authenticate, authorize(['ADMIN']), (req, res, next) => {
  try {
    const { decision, notes } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'APPROVED' or 'REJECTED'." });
    }

    const approval = get('SELECT * FROM approvals WHERE id = ?', [req.params.id]);
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval request not found.' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `This request has already been ${approval.status.toLowerCase()}.` });
    }

    const details = JSON.parse(approval.request_details || '{}');

    transaction(() => {
      // 1. Update approval status
      run(
        `UPDATE approvals
         SET status = ?, decision_notes = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [decision, notes || null, req.user.id, approval.id]
      );

      // 2. Execute business workflow side-effects if APPROVED
      if (decision === 'APPROVED') {
        if (approval.approval_type === 'RENTAL_EXTENSION') {
          // Update booking end_date and financial estimate
          const addDays = details.additional_days || 1;
          const addAmt = Number(details.additional_amount || 0);
          const newEndDate = details.new_end_date;

          if (newEndDate) {
            run(
              `UPDATE bookings
               SET end_date = ?,
                   total_days = total_days + ?,
                   extended_days = extended_days + ?,
                   estimated_total = estimated_total + ?,
                   extension_status = 'APPROVED'
               WHERE id = ?`,
              [newEndDate, addDays, addDays, addAmt, approval.entity_id]
            );

            // Also update rental expected_return_time
            run(
              'UPDATE rentals SET expected_return_time = ? WHERE booking_id = ?',
              [newEndDate, approval.entity_id]
            );
          }
        } else if (approval.approval_type === 'BOOKING_APPROVAL') {
          run("UPDATE bookings SET status = 'CONFIRMED' WHERE id = ?", [approval.entity_id]);
        } else if (approval.approval_type === 'CANCELLATION_REFUND') {
          const refundAmt = Number(details.net_refund || 0);
          const fee = Number(details.cancellation_fee || 0);
          run(
            `UPDATE bookings
             SET status = 'REFUNDED', cancellation_fee = ?, refund_amount = ?
             WHERE id = ?`,
            [fee, refundAmt, approval.entity_id]
          );
        }
      } else {
        // If rejected
        if (approval.approval_type === 'RENTAL_EXTENSION') {
          run("UPDATE bookings SET extension_status = 'REJECTED' WHERE id = ?", [approval.entity_id]);
        }
      }

      // 3. Notify requester
      run(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES (?, ?, ?, ?, ?)`,
        [
          approval.requested_by_user_id,
          `Request ${decision}: ${approval.approval_type.replace(/_/g, ' ')}`,
          `Your ${approval.approval_type.toLowerCase()} request has been ${decision.toLowerCase()} by administrator Rajesh Sharma.${notes ? ' Note: ' + notes : ''}`,
          decision === 'APPROVED' ? 'SUCCESS' : 'WARNING',
          '/approvals'
        ]
      );

      logAudit(
        req.user.id,
        `REVIEW_APPROVAL_${decision}`,
        'APPROVAL',
        approval.id,
        { approval_type: approval.approval_type, decision, notes },
        req.ip
      );
    });

    res.json({
      success: true,
      message: `Request successfully ${decision.toLowerCase()}.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
