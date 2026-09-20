import { useState, useEffect, FormEvent } from 'react';
import { supabase } from './supabaseClient';

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPAT: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'], 'O-': ['O-']
};
const HELPLINES = [
  { name: 'Red Cross Blood Bank', phone: '1910' },
  { name: 'e-RaktKosh National Helpline', phone: '011-23739412' },
  { name: 'AIIMS Blood Bank Helpline', phone: '011-26593250' }
];

export default function App() {
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ city: '', group: 'ALL', tab: 'ALL', sort: 'DEFAULT', quickFilter: 'ALL' });
  const [ui, setUi] = useState({ matrix: false, donorForm: false, urgentForm: false, bankForm: false, orderModal: false, helplines: false });
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ name: '', group: 'A+', city: '', phone: '', date: '', count: 1, fee: '', lat: 0, lng: 0 });
  const [uForm, setUForm] = useState({ name: '', group: 'O+', hosp: '', phone: '' });
  const [bForm, setBForm] = useState({ name: '', group: 'A+', units: 1, cost: 0, city: '', phone: '' });
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ patientName: '', units: 1, hospital: '', contact: '' });
  const [starred, setStarred] = useState<string[]>(() => JSON.parse(localStorage.getItem('starred_donors') || '[]'));
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('dark_mode') === 'true');

  useEffect(() => {
    loadData();
    navigator.geolocation?.getCurrentPosition(p => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }));
    
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'urgent_requests' }, payload => {
        setRequests(prev => [payload.new, ...prev]);
        if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      })
      .on('postgres_changes', { event: '*', schema: 'public' }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    localStorage.setItem('dark_mode', String(darkMode));
  }, [darkMode]);

  async function loadData() {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const [{ data: d }, { data: r }, { data: i }] = await Promise.all([
      supabase.from('donors').select('*'),
      supabase.from('urgent_requests').select('*').gte('created_at', dayAgo),
      supabase.from('blood_bank_inventory').select('*')
    ]);
    setDonors(d || []); setRequests(r || []); setInventory(i || []); setLoading(false);
  }

  const toggleStar = (id: string) => {
    const next = starred.includes(id) ? starred.filter(s => s !== id) : [...starred, id];
    setStarred(next);
    localStorage.setItem('starred_donors', JSON.stringify(next));
  };

  const validatePhone = (p: string) => /^\d{10}$/.test(p);
  const addDonor = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePhone(form.phone)) return alert('Enter valid 10-digit phone');
    await supabase.from('donors').insert([{ full_name: form.name, blood_group: form.group, city: form.city, phone_number: form.phone, last_donated_date: form.date || null, is_available: true, donation_count: form.count || 1, fee_amount: form.fee !== '' ? Number(form.fee) : null, lat: form.lat || null, lng: form.lng || null }]);
    loadData(); setUi({ ...ui, donorForm: false });
    setForm({ name: '', group: 'A+', city: '', phone: '', date: '', count: 1, fee: '', lat: 0, lng: 0 });
  };

  const addRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePhone(uForm.phone)) return alert('Enter valid 10-digit phone');
    await supabase.from('urgent_requests').insert([{ patient_name: uForm.name, blood_group: uForm.group, hospital_name: uForm.hosp, contact_number: uForm.phone }]);
    loadData(); setUi({ ...ui, urgentForm: false });
    setUForm({ name: '', group: 'O+', hosp: '', phone: '' });
  };

  const addInventory = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePhone(bForm.phone)) return alert('Enter valid 10-digit phone');
    await supabase.from('blood_bank_inventory').insert([{ facility_name: bForm.name, blood_group: bForm.group, units_available: Number(bForm.units), cost_per_unit: Number(bForm.cost), city: bForm.city, phone_number: bForm.phone }]);
    loadData(); setUi({ ...ui, bankForm: false });
    setBForm({ name: '', group: 'A+', units: 1, cost: 0, city: '', phone: '' });
  };

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePhone(orderForm.contact)) return alert('Enter valid 10-digit contact number');
    if (orderForm.units > selectedBank.units_available) return alert('Requested units exceed available inventory stock.');
    
    await supabase.from('urgent_requests').insert([{
      patient_name: `${orderForm.patientName} (Order from ${selectedBank.facility_name})`,
      blood_group: selectedBank.blood_group,
      hospital_name: orderForm.hospital,
      contact_number: orderForm.contact
    }]);

    await supabase.from('blood_bank_inventory').update({
      units_available: selectedBank.units_available - Number(orderForm.units)
    }).eq('id', selectedBank.id);

    alert('Blood order placed and broadcasted successfully!');
    setUi({ ...ui, orderModal: false });
    setOrderForm({ patientName: '', units: 1, hospital: '', contact: '' });
    loadData();
  };

  const calcDist = (l1: number, o1: number, l2: number, o2: number) => {
    const R = 6371, dL = (l2 - l1) * Math.PI / 180, dO = (o2 - o1) * Math.PI / 180;
    const a = Math.sin(dL / 2) ** 2 + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dO / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  };

  const getDays = (d?: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 999;
  const share = (txt: string) => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, '_blank');
  const nav = (lat?: number, lng?: number, c?: string) => window.open(lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : `https://maps.google.com/?q=${encodeURIComponent(c || '')}`, '_blank');

  let list = donors.filter(d => {
    const fee = Number(d.fee_amount || 0);
    const days = getDays(d.last_donated_date);
    if ((d.report_count || 0) >= 3 || !d.city.toLowerCase().includes(search.city.toLowerCase())) return false;
    if (search.group !== 'ALL' && d.blood_group !== search.group) return false;
    if (search.quickFilter === 'FREE' && fee > 0) return false;
    if (search.quickFilter === 'READY' && d.is_available === false) return false;
    if (search.quickFilter === 'ELIGIBLE' && days < 90) return false;
    if (search.quickFilter === 'UNIVERSAL' && d.blood_group !== 'O-') return false;
    if (search.quickFilter === 'STARRED' && !starred.includes(d.id)) return false;
    return true;
  });

  if (search.tab === 'NEARBY' && userLoc) {
    list = list.filter(d => d.lat && d.lng).map(d => ({ ...d, dist: calcDist(userLoc.lat, userLoc.lng, d.lat!, d.lng!) })).sort((a, b) => a.dist - b.dist);
  }
  if (search.sort === 'FREE') list.sort((a, b) => Number(a.fee_amount || 0) - Number(b.fee_amount || 0));
  else if (search.sort === 'DONATIONS') list.sort((a, b) => (b.donation_count || 0) - (a.donation_count || 0));

  list.sort((a, b) => (starred.includes(b.id) ? 1 : 0) - (starred.includes(a.id) ? 1 : 0));

  let filteredInv = inventory.filter(b => {
    if (!b.city.toLowerCase().includes(search.city.toLowerCase())) return false;
    if (search.group !== 'ALL' && b.blood_group !== search.group) return false;
    return true;
  });

  const uniqueCities = new Set([...donors, ...inventory].map(x => x.city?.trim().toLowerCase())).size;

  const bgMain = darkMode ? '#0f172a' : '#f8fafc';
  const textMain = darkMode ? '#f8fafc' : '#0f172a';
  const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';
  const inputBg = darkMode ? '#0f172a' : '#ffffff';

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: bgMain, color: textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444', margin: 0, letterSpacing: '-0.025em' }}>🚨 Emergency Blood Directory</h1>
          <p style={{ fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>Connecting lives in real-time</p>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          style={{ background: darkMode ? '#334155' : '#e2e8f0', color: textMain, border: 'none', padding: '0.4rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ backgroundColor: cardBg, padding: '0.75rem', textAlign: 'center', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: textMain }}>{donors.length}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: darkMode ? '#94a3b8' : '#64748b' }}>Donors</div>
        </div>
        <div style={{ backgroundColor: cardBg, padding: '0.75rem', textAlign: 'center', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444' }}>{requests.length}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: darkMode ? '#94a3b8' : '#64748b' }}>Active Alerts</div>
        </div>
        <div style={{ backgroundColor: cardBg, padding: '0.75rem', textAlign: 'center', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: textMain }}>{uniqueCities}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: darkMode ? '#94a3b8' : '#64748b' }}>Cities</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <a href="tel:108" style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '0.6rem 0.4rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }}>
          🚑 108 Emergency
        </a>
        <button onClick={() => setUi({ ...ui, matrix: !ui.matrix, helplines: false })} style={{ backgroundColor: '#0284c7', color: '#ffffff', padding: '0.6rem 0.4rem', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.2)' }}>
          🩸 Compatibility
        </button>
        <button onClick={() => setUi({ ...ui, helplines: !ui.helplines, matrix: false })} style={{ backgroundColor: '#64748b', color: '#ffffff', padding: '0.6rem 0.4rem', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(100,116,139,0.2)' }}>
          📞 Helplines
        </button>
      </div>

      {ui.matrix && (
        <div style={{ backgroundColor: darkMode ? '#0c4a6e' : '#e0f2fe', border: `1px solid ${darkMode ? '#0369a1' : '#bae6fd'}`, padding: '0.85rem', borderRadius: '0.75rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '800', marginBottom: '0.4rem', color: darkMode ? '#38bdf8' : '#0369a1' }}>Blood Group Compatibility Guide</div>
          {Object.entries(COMPAT).map(([k, v]) => (
            <div key={k} style={{ marginBottom: '0.25rem' }}><b>{k}</b> can receive from: {v.join(', ')}</div>
          ))}
        </div>
      )}

      {ui.helplines && (
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, padding: '0.85rem', borderRadius: '0.75rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '800', marginBottom: '0.5rem' }}>Official Blood Bank Helplines:</div>
          {HELPLINES.map(h => (
            <div key={h.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: `1px solid ${borderColor}`, paddingTop: '0.4rem' }}>
              <span>{h.name}</span>
              <a href={`tel:${h.phone}`} style={{ backgroundColor: '#16a34a', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: '700', fontSize: '0.75rem' }}>{h.phone}</a>
            </div>
          ))}
        </div>
      )}

      {requests.map(r => (
        <div key={r.id} style={{ backgroundColor: darkMode ? '#451a03' : '#fef3c7', border: `1px solid ${darkMode ? '#78350f' : '#fde68a'}`, padding: '0.85rem', borderRadius: '0.75rem', marginBottom: '0.85rem', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: '800', color: darkMode ? '#fbbf24' : '#d97706', marginBottom: '0.2rem' }}>⚠️ URGENT: {r.patient_name} ({r.blood_group})</div>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: textMain }}>Hospital: {r.hospital_name}</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <a href={`tel:${r.contact_number}`} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', textAlign: 'center', padding: '0.4rem', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>Call</a>
            <button onClick={() => share(`URGENT: ${r.patient_name} (${r.blood_group}) at ${r.hospital_name}. Call: ${r.contact_number}`)} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>WhatsApp</button>
            <button onClick={async () => { await supabase.from('urgent_requests').delete().eq('id', r.id); loadData(); }} style={{ flex: 1, backgroundColor: '#475569', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Resolve</button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', padding: '0.3rem', borderRadius: '0.75rem', marginBottom: '0.85rem' }}>
        <button onClick={() => setSearch({ ...search, tab: 'ALL' })} style={{ flex: 1, padding: '0.45rem', borderRadius: '0.5rem', border: 'none', backgroundColor: search.tab === 'ALL' ? cardBg : 'transparent', color: search.tab === 'ALL' ? textMain : (darkMode ? '#94a3b8' : '#64748b'), fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>📋 Donors</button>
        <button onClick={() => { setSearch({ ...search, tab: 'NEARBY' }); navigator.geolocation?.getCurrentPosition(p => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude })); }} style={{ flex: 1, padding: '0.45rem', borderRadius: '0.5rem', border: 'none', backgroundColor: search.tab === 'NEARBY' ? cardBg : 'transparent', color: search.tab === 'NEARBY' ? textMain : (darkMode ? '#94a3b8' : '#64748b'), fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>📍 Near Me</button>
        <button onClick={() => setSearch({ ...search, tab: 'BANKS' })} style={{ flex: 1, padding: '0.45rem', borderRadius: '0.5rem', border: 'none', backgroundColor: search.tab === 'BANKS' ? cardBg : 'transparent', color: search.tab === 'BANKS' ? textMain : (darkMode ? '#94a3b8' : '#64748b'), fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>🏥 Blood Banks</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <button onClick={() => setUi({ ...ui, donorForm: !ui.donorForm, urgentForm: false, bankForm: false, orderModal: false })} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 0.2rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>➕ Register Donor</button>
        <button onClick={() => setUi({ ...ui, urgentForm: !ui.urgentForm, donorForm: false, bankForm: false, orderModal: false })} style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '0.5rem 0.2rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>📢 Broadcast</button>
        <button onClick={() => setUi({ ...ui, bankForm: !ui.bankForm, donorForm: false, urgentForm: false, orderModal: false })} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0.5rem 0.2rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>🏥 Add Bank</button>
      </div>

      {ui.donorForm && (
        <form onSubmit={addDonor} style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Register as Donor</div>
          <input placeholder="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input placeholder="City" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="10-digit Phone" maxLength={10} required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input type="number" min="0" placeholder="Fee (₹) - Blank for Free" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition(p => setForm({ ...form, lat: p.coords.latitude, lng: p.coords.longitude }))} style={{ width: '100%', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '0.375rem', fontWeight: '700', marginBottom: '0.5rem', cursor: 'pointer' }}>📍 Tag GPS Location</button>
          <button type="submit" style={{ width: '100%', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Save Donor Profile</button>
        </form>
      )}

      {ui.urgentForm && (
        <form onSubmit={addRequest} style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Broadcast Emergency Request</div>
          <input placeholder="Patient Name" required value={uForm.name} onChange={e => setUForm({ ...uForm, name: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <select value={uForm.group} onChange={e => setUForm({ ...uForm, group: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input placeholder="Hospital Name & City" required value={uForm.hosp} onChange={e => setUForm({ ...uForm, hosp: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="10-digit Contact Phone" maxLength={10} required value={uForm.phone} onChange={e => setUForm({ ...uForm, phone: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Publish Broadcast</button>
        </form>
      )}

      {ui.bankForm && (
        <form onSubmit={addInventory} style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Add Blood Bank Stock</div>
          <input placeholder="Hospital / Blood Bank Name" required value={bForm.name} onChange={e => setBForm({ ...bForm, name: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <select value={bForm.group} onChange={e => setBForm({ ...bForm, group: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input type="number" min="1" placeholder="Units Available" required value={bForm.units} onChange={e => setBForm({ ...bForm, units: Number(e.target.value) })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input type="number" min="0" placeholder="Cost per Unit (₹) (0 for Free)" required value={bForm.cost} onChange={e => setBForm({ ...bForm, cost: Number(e.target.value) })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="City" required value={bForm.city} onChange={e => setBForm({ ...bForm, city: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="10-digit Helpline Phone" maxLength={10} required value={bForm.phone} onChange={e => setBForm({ ...bForm, phone: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Publish Stock Inventory</button>
        </form>
      )}

      {ui.orderModal && selectedBank && (
        <form onSubmit={placeOrder} style={{ backgroundColor: cardBg, border: '2px solid #16a34a', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: '800', color: '#16a34a', marginBottom: '0.3rem' }}>📦 Order Stock from {selectedBank.facility_name}</div>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: darkMode ? '#94a3b8' : '#64748b' }}>Blood Group: <b>{selectedBank.blood_group}</b> | Stock Available: <b>{selectedBank.units_available} units</b></div>
          <input placeholder="Patient Name" required value={orderForm.patientName} onChange={e => setOrderForm({ ...orderForm, patientName: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input type="number" min="1" max={selectedBank.units_available} placeholder="Units Needed" required value={orderForm.units} onChange={e => setOrderForm({ ...orderForm, units: Number(e.target.value) })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="Hospital Name" required value={orderForm.hospital} onChange={e => setOrderForm({ ...orderForm, hospital: e.target.value })} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <input placeholder="10-digit Contact Phone" maxLength={10} required value={orderForm.contact} onChange={e => setOrderForm({ ...orderForm, contact: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Confirm Order</button>
            <button type="button" onClick={() => setUi({ ...ui, orderModal: false })} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <input 
          placeholder="Search city..." 
          value={search.city} 
          onChange={e => setSearch({ ...search, city: e.target.value })} 
          style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, fontSize: '0.85rem', outline: 'none' }} 
        />
        <select 
          value={search.group} 
          onChange={e => setSearch({ ...search, group: e.target.value })} 
          style={{ padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, backgroundColor: inputBg, color: textMain, fontWeight: '700', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="ALL">ALL GROUPS</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {search.tab !== 'BANKS' && (
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.4rem', marginBottom: '0.85rem' }}>
          {['ALL', 'FREE', 'READY', 'ELIGIBLE', 'UNIVERSAL', 'STARRED'].map(f => (
            <button 
              key={f} 
              onClick={() => setSearch({ ...search, quickFilter: f })} 
              style={{ 
                padding: '0.3rem 0.65rem', borderRadius: '999px', border: 'none', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                backgroundColor: search.quickFilter === f ? '#ef4444' : (darkMode ? '#334155' : '#e2e8f0'),
                color: search.quickFilter === f ? '#ffffff' : (darkMode ? '#94a3b8' : '#475569')
              }}
            >
              {f === 'ALL' ? '🔍 All Donors' : f === 'FREE' ? '💚 Free Only' : f === 'READY' ? '🟢 Ready Now' : f === 'ELIGIBLE' ? '✅ Eligible' : f === 'UNIVERSAL' ? '🩸 O- Universal' : '⭐ Starred'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: darkMode ? '#94a3b8' : '#64748b' }}>Loading directory data...</div>
      ) : search.tab === 'BANKS' ? (
        filteredInv.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: cardBg, borderRadius: '0.75rem', border: `1px solid ${borderColor}` }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#94a3b8' : '#64748b' }}>No blood bank inventory found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredInv.map(b => (
              <div key={b.id} style={{ backgroundColor: cardBg, padding: '0.85rem', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{b.facility_name}</div>
                  <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: '800', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem' }}>{b.blood_group}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#475569', marginBottom: '0.5rem' }}>📍 {b.city} | 📦 {b.units_available} Units | 💰 {b.cost_per_unit === 0 ? 'Free' : `₹${b.cost_per_unit}`}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  <a href={`tel:${b.phone_number}`} style={{ backgroundColor: '#2563eb', color: '#fff', textAlign: 'center', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>Call Bank</a>
                  <button onClick={() => { setSelectedBank(b); setUi({ ...ui, orderModal: true }); }} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Order Stock</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: cardBg, borderRadius: '0.75rem', border: `1px solid ${borderColor}` }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#94a3b8' : '#64748b' }}>No matching donors found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {list.map(d => {
              const days = getDays(d.last_donated_date);
              const isEligible = days >= 90;
              const isStarred = starred.includes(d.id);
              return (
                <div key={d.id} style={{ backgroundColor: cardBg, padding: '0.85rem', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1rem', color: textMain }}>{d.full_name || 'Donor'}</span>
                      <button onClick={() => toggleStar(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
                        {isStarred ? '⭐' : '☆'}
                      </button>
                    </div>
                    <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: '800', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
                      {d.blood_group}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', marginBottom: '0.4rem', display: 'flex', gap: '0.5rem' }}>
                    <span>{Number(d.fee_amount || 0) === 0 ? '💚 Free' : `💰 ₹${d.fee_amount}`}</span>
                    <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>⭐ {d.donation_count || 1}x Donated</span>
                    {search.tab === 'NEARBY' && d.dist !== undefined && <span style={{ color: '#0ea5e9' }}>📍 {d.dist} km away</span>}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#475569', marginBottom: '0.5rem' }}>
                    📍 {d.city} | 📞 {d.phone_number}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: d.is_available !== false ? (darkMode ? '#064e3b' : '#dcfce7') : (darkMode ? '#334155' : '#f1f5f9'), color: d.is_available !== false ? '#16a34a' : (darkMode ? '#94a3b8' : '#64748b'), padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      {d.is_available !== false ? '● Ready Now' : '● Unavailable'}
                    </span>
                    <span style={{ backgroundColor: isEligible ? (darkMode ? '#064e3b' : '#dcfce7') : (darkMode ? '#451a03' : '#fef3c7'), color: isEligible ? '#16a34a' : '#d97706', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                      {isEligible ? '✅ Eligible' : `⏳ ${90 - days}d left`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                    <a href={`tel:${d.phone_number}`} style={{ backgroundColor: '#2563eb', color: '#fff', textAlign: 'center', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>Call</a>
                    <a href={`https://wa.me/91${d.phone_number}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#16a34a', color: '#fff', textAlign: 'center', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>WhatsApp</a>
                    <button onClick={() => nav(d.lat, d.lng, d.city)} style={{ backgroundColor: '#ca8a04', color: '#fff', border: 'none', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Route</button>
                    <button onClick={() => { navigator.clipboard.writeText(d.phone_number); alert('Phone number copied!'); }} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Copy</button>
                  </div>

                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
