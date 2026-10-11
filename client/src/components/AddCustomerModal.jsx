import React, { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Modal } from './Modal';
import { UserPlus, User, Mail, Phone, CreditCard, Calendar, MapPin, Key, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export function AddCustomerModal({ isOpen, onClose, onCustomerCreated, zIndex = 200 }) {
  const { showToast } = useToast();

  const getDefaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().split('T')[0];
  };

  const initialFormState = {
    full_name: '',
    email: '',
    phone: '',
    password: 'Customer@123',
    driving_license_no: '',
    license_expiry: getDefaultExpiry(),
    id_card_type: 'DRIVERS_LICENSE',
    id_card_no: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postal_code: '400001'
  };

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = () => {
    setForm({
      ...initialFormState,
      license_expiry: getDefaultExpiry()
    });
    setErrorMsg('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Rich diverse Indian profiles for dynamic auto-fill
  const sampleFirstNames = [
    'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Meera', 'Kabir', 'Neha',
    'Karthik', 'Divya', 'Vikram', 'Pooja', 'Rahul', 'Sneha', 'Arjun', 'Tanvi',
    'Ishaan', 'Rhea', 'Varun', 'Shreya', 'Siddharth', 'Kavya', 'Gaurav', 'Deepika',
    'Manish', 'Kritika', 'Alok', 'Sunita', 'Harsh', 'Tara'
  ];

  const sampleLastNames = [
    'Sharma', 'Verma', 'Patel', 'Kapoor', 'Reddy', 'Nair', 'Iyer', 'Deshmukh',
    'Joshi', 'Mehra', 'Malhotra', 'Gupta', 'Choudhury', 'Menon', 'Bhat',
    'Chatterjee', 'Singhania', 'Rao', 'Kulkarni', 'Agarwal', 'Pillai', 'Saxena'
  ];

  const sampleLocations = [
    { city: 'Mumbai', state: 'Maharashtra', code: 'MH', pin: '400051', area: 'Bandra Kurla Complex' },
    { city: 'Bengaluru', state: 'Karnataka', code: 'KA', pin: '560001', area: 'Indiranagar 100ft Road' },
    { city: 'New Delhi', state: 'Delhi', code: 'DL', pin: '110001', area: 'Connaught Place Outer Circle' },
    { city: 'Hyderabad', state: 'Telangana', code: 'TS', pin: '500081', area: 'HITEC City Madhapur' },
    { city: 'Chennai', state: 'Tamil Nadu', code: 'TN', pin: '600028', area: 'R.A. Puram Greenways Road' },
    { city: 'Pune', state: 'Maharashtra', code: 'MH', pin: '411006', area: 'Kalyani Nagar Main Road' },
    { city: 'Kolkata', state: 'West Bengal', code: 'WB', pin: '700016', area: 'Park Street Central' },
    { city: 'Ahmedabad', state: 'Gujarat', code: 'GJ', pin: '380015', area: 'SG Highway Satellite' },
    { city: 'Kochi', state: 'Kerala', code: 'KL', pin: '682020', area: 'Panampilly Nagar Avenue' },
    { city: 'Jaipur', state: 'Rajasthan', code: 'RJ', pin: '302001', area: 'C-Scheme Ashok Nagar' },
    { city: 'Chandigarh', state: 'Punjab', code: 'CH', pin: '160017', area: 'Sector 17 Commercial Complex' }
  ];

  // Quick helper to auto-fill sample data for convenience with diverse names & addresses
  const handleAutoFill = () => {
    const fName = sampleFirstNames[Math.floor(Math.random() * sampleFirstNames.length)];
    const lName = sampleLastNames[Math.floor(Math.random() * sampleLastNames.length)];
    const loc = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
    const rNum = Math.floor(1000 + Math.random() * 9000);
    const rtoCode = String(Math.floor(10 + Math.random() * 89));
    const currentYear = new Date().getFullYear();
    const licenseNo = `${loc.code}-${rtoCode}${currentYear}${Math.floor(1000000 + Math.random() * 8999999)}`;
    const phonePrefix = ['98', '97', '99', '96', '94', '95', '91', '90'][Math.floor(Math.random() * 8)];
    const phoneNo = `+91 ${phonePrefix}${Math.floor(10000000 + Math.random() * 90000000)}`;

    setForm({
      full_name: `${fName} ${lName}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${rNum}@example.in`,
      phone: phoneNo,
      password: 'Customer@123',
      driving_license_no: licenseNo,
      license_expiry: getDefaultExpiry(),
      id_card_type: 'DRIVERS_LICENSE',
      id_card_no: licenseNo,
      address: `Plot ${Math.floor(12 + Math.random() * 88)}, ${loc.area}`,
      city: loc.city,
      state: loc.state,
      postal_code: loc.pin
    });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.full_name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!form.email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    if (!form.driving_license_no.trim()) {
      setErrorMsg('Driving License Number is required.');
      return;
    }
    if (!form.license_expiry) {
      setErrorMsg('License Expiry Date is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createCustomer(form);

      if (res.success && res.customer) {
        showToast(`Customer "${res.customer.full_name}" registered successfully!`, 'success');
        if (onCustomerCreated) {
          onCustomerCreated(res.customer);
        }
        handleClose();
      } else {
        throw new Error(res.message || 'Failed to create customer record.');
      }
    } catch (err) {
      const msg = err.message || 'An error occurred while creating the customer.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register & Add New Customer"
      maxWidth={680}
      zIndex={zIndex}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Banner with Autofill shortcut */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.9rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <UserPlus size={16} color="var(--primary)" />
            <span>Create walk-in customer profile. Will be auto-selected once registered.</span>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Auto-fill with sample valid customer data"
          >
            <Sparkles size={13} color="var(--warning)" /> Auto-Fill Sample
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Name and Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <User size={14} color="var(--primary)" /> Full Name *
            </label>
            <input
              required
              placeholder="e.g. Ramesh Kumar"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <Mail size={14} color="var(--primary)" /> Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. ramesh.kumar@example.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        {/* License Number and Expiry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <CreditCard size={14} color="var(--primary)" /> Driving License No. *
            </label>
            <input
              required
              placeholder="e.g. DL-0420240099881"
              value={form.driving_license_no}
              onChange={(e) => setForm({ ...form, driving_license_no: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <Calendar size={14} color="var(--primary)" /> License Expiry *
            </label>
            <input
              type="date"
              required
              value={form.license_expiry}
              onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
            />
          </div>
        </div>

        {/* Phone & Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <Phone size={14} color="var(--primary)" /> Phone Number
            </label>
            <input
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              <Key size={14} color="var(--primary)" /> Initial Password
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Customer@123"
            />
          </div>
        </div>

        {/* Residential Address */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
            <MapPin size={14} color="var(--primary)" /> Residential Address
          </label>
          <input
            placeholder="e.g. Plot 42, Bandra Kurla Complex, Bandra East"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        {/* City, State, Postal Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>City</label>
            <input
              placeholder="Mumbai"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>State</label>
            <input
              placeholder="Maharashtra"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>PIN / Postal Code</label>
            <input
              placeholder="400051"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinner" /> Registering Customer...
              </>
            ) : (
              <>
                <UserPlus size={16} /> Register & Select Customer
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
