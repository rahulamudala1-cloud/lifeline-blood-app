import { useEffect, useState, FormEvent } from 'react';
import { supabase } from './supabaseClient';

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPAT: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'], 'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
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
  const [ui, setUi] = useState({ matrix: false, donorForm: false, urgentForm: false, bankForm: false, orderModal: false, helplines: false, copiedId: '' });
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
    
    // Create an urgent broadcast request automatically + log/reduce stock
    await supabase.from('urgent_requests').insert([{
      patient_name: `${orderForm.patientName} (Order from ${selectedBank.facility_name})`,
      blood_group: selectedBank.blood_group,
      hospital_name: orderForm.hospital,
      contact_number: orderForm.contact
    }]);

    // Update inventory stock count
    await supabase.from('blood_bank_inventory').update({
      units_available: selectedBank.units_available - Number(orderForm.units)
    }).eq('id', selectedBank.id);

    alert('Blood order placed and broadcasted successfully!');
    setUi({ ...ui, orderModal: false });
    setOrderForm({ patientName: '', units: 1, hospital: '', contact: '' });
    loadData();
  };

  const updateDonor = async (id: string, updates: any) => {
    await supabase.from('donors').update(updates).eq('id', id);
    setDonors(donors.map(d => d.id === id ? { ...d, ...updates } : d));
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
  const sInput = { width: '100%', marginBottom: '6px', padding: '6px', boxSizing: 'border-box' as const, background: darkMode ? '#2a2a2a' : '#fff', color: darkMode ? '#fff' : '#000', border: darkMode ? '1px solid #444' : '1px solid #ccc' };
  const btn = (bg: string, c = '#fff') => ({ backgroundColor: bg, color: c, border: 'none', padding: '6px 8px', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '11px' });

  return (
    <div style={{ maxWidth: '550px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif', backgroundColor: darkMode ? '#121212' : '#fff', color: darkMode ? '#f1f1f1' : '#000', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button onClick={() => setDarkMode(!darkMode)} style={{ ...btn(darkMode ? '#f1f1f1' : '#333', darkMode ? '#121212' : '#fff'), fontSize: '10px', padding: '4px 8px' }}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <h2 style={{ textAlign: 'center', color: '#d9534f', margin: '0 0 4px' }}>🚨 Emergency Blood Directory</h2>
      <p style={{ textAlign: 'center', color: darkMode ? '#aaa' : '#666', fontSize: '12px', margin: '0 0 8px' }}>Connecting lives in real-time</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', background: darkMode ? '#1e1e1e' : '#f8f9fa', border: darkMode ? '1px solid #333' : '1px solid #e9ecef', borderRadius: '6px', padding: '6px', marginBottom: '10px', fontSize: '11px', textAlign: 'center' }}>
        <div><b>{donors.length}</b><br/><span style={{ color: darkMode ? '#aaa' : '#666' }}>Donors</span></div>
        <div style={{ borderLeft: darkMode ? '1px solid #444' : '1px solid #ddd' }}></div>
        <div><b>{requests.length}</b><br/><span style={{ color: darkMode ? '#aaa' : '#666' }}>Active Alerts</span></div>
        <div style={{ borderLeft: darkMode ? '1px solid #444' : '1px solid #ddd' }}></div>
        <div><b>{uniqueCities}</b><br/><span style={{ color: darkMode ? '#aaa' : '#666' }}>Cities</span></div>
      </div>

      <div style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
        <a href="tel:108" style={{ ...btn('#dc3545'), flex: 1, textAlign: 'center', textDecoration: 'none' }}>🚑 108 Emergency</a>
        <button onClick={() => setUi({ ...ui, matrix: !ui.matrix, helplines: false })} style={{ ...btn('#17a2b8'), flex: 1 }}>🩸 Compatibility</button>
        <button onClick={() => setUi({ ...ui, helplines: !ui.helplines, matrix: false })} style={{ ...btn('#6c757d'), flex: 1 }}>📞 Helplines</button>
      </div>

      {ui.matrix && (
        <div style={{ background: darkMode ? '#1a2e3b' : '#eef7fc', border: darkMode ? '1px solid #2b5278' : '1px solid #b8daff', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
          {Object.entries(COMPAT).map(([k, v]) => <div key={k}><b>{k}</b> receives: {v.join(', ')}</div>)}
        </div>
      )}

      {ui.helplines && (
        <div style={{ background: darkMode ? '#1e1e1e' : '#f8f9fa', border: darkMode ? '1px solid #444' : '1px solid #ced4da', padding: '8px', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>
          <b>Official Blood Bank Helplines:</b>
          {HELPLINES.map(h => (
            <div key={h.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: darkMode ? '1px solid #333' : '1px solid #eee', paddingTop: '4px' }}>
              <span>{h.name}</span>
              <a href={`tel:${h.phone}`} style={{ background: '#28a745', color: '#fff', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>{h.phone}</a>
            </div>
          ))}
        </div>
      )}

      {requests.map(r => (
        <div key={r.id} style={{ background: darkMode ? '#3d351a' : '#fff3cd', border: darkMode ? '1px solid #665214' : '1px solid #ffeeba', padding: '8px', margin: '8px 0', borderRadius: '6px', fontSize: '13px' }}>
          <b>{r.patient_name}</b> ({r.blood_group}) at {r.hospital_name}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <a href={`tel:${r.contact_number}`} style={{ ...btn('#007bff'), textDecoration: 'none' }}>📞 Call</a>
            <button onClick={() => share(`URGENT: ${r.patient_name} (${r.blood_group}) at ${r.hospital_name}. Call: ${r.contact_number}`)} style={btn('#25D366')}>💬 WhatsApp</button>
            <button onClick={async () => { await supabase.from('urgent_requests').delete().eq('id', r.id); loadData(); }} style={btn('#28a745')}>✅ Done</button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '4px', margin: '10px 0', background: darkMode ? '#222' : '#eee', padding: '4px', borderRadius: '6px' }}>
        <button onClick={() => setSearch({ ...search, tab: 'ALL' })} style={{ ...btn(search.tab === 'ALL' ? (darkMode ? '#333' : '#fff') : 'transparent', search.tab === 'ALL' ? (darkMode ? '#fff' : '#333') : (darkMode ? '#aaa' : '#333')), flex: 1 }}>📋 Donors</button>
        <button onClick={() => { setSearch({ ...search, tab: 'NEARBY' }); navigator.geolocation?.getCurrentPosition(p => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude })); }} style={{ ...btn(search.tab === 'NEARBY' ? (darkMode ? '#333' : '#fff') : 'transparent', '#d9534f'), flex: 1 }}>📍 Near Me</button>
        <button onClick={() => setSearch({ ...search, tab: 'BANKS' })} style={{ ...btn(search.tab === 'BANKS' ? (darkMode ? '#333' : '#fff') : 'transparent', '#007bff'), flex: 1 }}>🏥 Blood Banks</button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <button onClick={() => setUi({ ...ui, donorForm: !ui.donorForm, urgentForm: false, bankForm: false, orderModal: false })} style={{ ...btn('#d9534f'), flex: 1, padding: '8px' }}>➕ Register Donor</button>
        <button onClick={() => setUi({ ...ui, urgentForm: !ui.urgentForm, donorForm: false, bankForm: false, orderModal: false })} style={{ ...btn('#ffc107', '#222'), flex: 1, padding: '8px' }}>📢 Broadcast Request</button>
        <button onClick={() => setUi({ ...ui, bankForm: !ui.bankForm, donorForm: false, urgentForm: false, orderModal: false })} style={{ ...btn('#17a2b8'), flex: 1, padding: '8px' }}>🏥 Add Bank Stock</button>
      </div>

      {ui.donorForm && (
        <form onSubmit={addDonor} style={{ background: darkMode ? '#1e1e1e' : '#f8f9fa', border: darkMode ? '1px solid #444' : '1px solid #ccc', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
          <input placeholder="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={sInput} />
          <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} style={sInput}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input placeholder="City" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={sInput} />
          <input placeholder="10-digit Phone" maxLength={10} required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} style={sInput} />
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={sInput} />
          <input type="number" min="0" placeholder="Fee (₹) - Blank for Free" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} style={sInput} />
          <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition(p => setForm({ ...form, lat: p.coords.latitude, lng: p.coords.longitude }))} style={{ ...btn('#17a2b8'), width: '100%', marginBottom: '6px' }}>📍 Tag GPS</button>
          <button type="submit" style={{ ...btn('#28a745'), width: '100%', padding: '8px' }}>Submit</button>
        </form>
      )}

      {ui.urgentForm && (
        <form onSubmit={addRequest} style={{ background: darkMode ? '#2a2614' : '#fff8e6', border: darkMode ? '1px solid #574c18' : '1px solid #ffeeba', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
          <input placeholder="Patient Name" required value={uForm.name} onChange={e => setUForm({ ...uForm, name: e.target.value })} style={sInput} />
          <select value={uForm.group} onChange={e => setUForm({ ...uForm, group: e.target.value })} style={sInput}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input placeholder="Hospital & City" required value={uForm.hosp} onChange={e => setUForm({ ...uForm, hosp: e.target.value })} style={sInput} />
          <input placeholder="10-digit Phone" maxLength={10} required value={uForm.phone} onChange={e => setUForm({ ...uForm, phone: e.target.value.replace(/\D/g, '') })} style={sInput} />
          <button type="submit" style={{ ...btn('#d9534f'), width: '100%', padding: '8px' }}>Post Request</button>
        </form>
      )}

      {ui.bankForm && (
        <form onSubmit={addInventory} style={{ background: darkMode ? '#142533' : '#eef7fc', border: darkMode ? '1px solid #204563' : '1px solid #b8daff', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
          <input placeholder="Hospital / Trust Name" required value={bForm.name} onChange={e => setBForm({ ...bForm, name: e.target.value })} style={sInput} />
          <select value={bForm.group} onChange={e => setBForm({ ...bForm, group: e.target.value })} style={sInput}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
          <input type="number" min="1" placeholder="Units Available" required value={bForm.units} onChange={e => setBForm({ ...bForm, units: Number(e.target.value) })} style={sInput} />
          <input type="number" min="0" placeholder="Cost per Unit (₹) (0 for Free)" required value={bForm.cost} onChange={e => setBForm({ ...bForm, cost: Number(e.target.value) })} style={sInput} />
          <input placeholder="City" required value={bForm.city} onChange={e => setBForm({ ...bForm, city: e.target.value })} style={sInput} />
          <input placeholder="10-digit Helpline Phone" maxLength={10} required value={bForm.phone} onChange={e => setBForm({ ...bForm, phone: e.target.value.replace(/\D/g, '') })} style={sInput} />
          <button type="submit" style={{ ...btn('#007bff'), width: '100%', padding: '8px' }}>Publish Stock</button>
        </form>
      )}

      {ui.orderModal && selectedBank && (
        <form onSubmit={placeOrder} style={{ background: darkMode ? '#1e251e' : '#e6f4ea', border: darkMode ? '1px solid #285430' : '1px solid #ceead6', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
          <b>📦 Order Blood Units from {selectedBank.facility_name}</b>
          <p style={{ fontSize: '11px', margin: '4px 0 8px', color: darkMode ? '#aaa' : '#555' }}>Blood Group: <b>{selectedBank.blood_group}</b> | Available: <b>{selectedBank.units_available} units</b></p>
          <input placeholder="Patient Name" required value={orderForm.patientName} onChange={e => setOrderForm({ ...orderForm, patientName: e.target.value })} style={sInput} />
          <input type="number" min="1" max={selectedBank.units_available} placeholder="Units Needed" required value={orderForm.units} onChange={e => setOrderForm({ ...orderForm, units: Number(e.target.value) })} style={sInput} />
          <input placeholder="Destination Hospital Name" required value={orderForm.hospital} onChange={e => setOrderForm({ ...orderForm, hospital: e.target.value })} style={sInput} />
          <input placeholder="10-digit Contact Phone" maxLength={10} required value={orderForm.contact} onChange={e => setOrderForm({ ...orderForm, contact: e.target.value.replace(/\D/g, '') })} style={sInput} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="submit" style={{ ...btn('#28a745'), flex: 1, padding: '8px' }}>Confirm Order</button>
            <button type="button" onClick={() => setUi({ ...ui, orderModal: false })} style={{ ...btn('#6c757d'), flex: 1, padding: '8px' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <input placeholder="Search City..." value={search.city} onChange={e => setSearch({ ...search, city: e.target.value })} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: darkMode ? '1px solid #444' : '1px solid #ccc', background: darkMode ? '#2a2a2a' : '#fff', color: darkMode ? '#fff' : '#000' }} />
        <select value={search.group} onChange={e => setSearch({ ...search, group: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: darkMode ? '1px solid #444' : '1px solid #ccc', background: darkMode ? '#2a2a2a' : '#fff', color: darkMode ? '#fff' : '#000' }}>{['ALL', ...GROUPS].map(g => <option key={g}>{g}</option>)}</select>
        {search.tab !== 'BANKS' && (
          <select value={search.sort} onChange={e => setSearch({ ...search, sort: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: darkMode ? '1px solid #444' : '1px solid #ccc', fontSize: '11px', background: darkMode ? '#2a2a2a' : '#fff', color: darkMode ? '#fff' : '#000' }}>
            <option value="DEFAULT">Sort: Default</option>
            <option value="FREE">💚 Free First</option>
            <option value="DONATIONS">⭐ Most Active</option>
          </select>
        )}
      </div>

      {search.tab !== 'BANKS' && (
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'All Donors' }, { id: 'FREE', label: '💚 Free Only' },
            { id: 'READY', label: '🟢 Ready Now' }, { id: 'ELIGIBLE', label: '✅ Eligible (90d)' },
            { id: 'UNIVERSAL', label: '🩸 O- Universal' }, { id: 'STARRED', label: '⭐ Starred' },
          ].map(p => (
            <button key={p.id} onClick={() => setSearch({ ...search, quickFilter: p.id })} style={{ ...btn(search.quickFilter === p.id ? '#007bff' : (darkMode ? '#333' : '#e2e3e5'), search.quickFilter === p.id ? '#fff' : (darkMode ? '#ccc' : '#333')), borderRadius: '12px', whiteSpace: 'nowrap' }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {loading ? <p style={{ textAlign: 'center' }}>Loading...</p> : search.tab === 'BANKS' ? (
        filteredInv.length === 0 ? <p style={{ textAlign: 'center', color: darkMode ? '#aaa' : '#666', marginTop: '20px' }}>No blood bank inventory listed for this filter.</p> :
        filteredInv.map((b: any) => (
          <div key={b.id} style={{ border: darkMode ? '1px solid #204563' : '1px solid #b8daff', padding: '10px', borderRadius: '6px', marginBottom: '8px', background: darkMode ? '#16222b' : '#eef7fc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>🏥 {b.facility_name}</b>
                <div style={{ color: Number(b.cost_per_unit) === 0 ? '#28a745' : '#d9534f', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                  {Number(b.cost_per_unit) === 0 ? '💚 Free Units' : `💰 Cost: ₹${b.cost_per_unit} / unit`} | 🩸 <b>{b.units_available} units available</b>
                </div>
              </div>
              <span style={{ background: '#007bff', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{b.blood_group}</span>
            </div>
            <p style={{ margin: '4px 0', fontSize: '13px', color: darkMode ? '#aaa' : '#555' }}>📍 {b.city} | 📞 {b.phone_number}</p>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <button onClick={() => { setSelectedBank(b); setUi({ ...ui, orderModal: true }); }} style={{ ...btn('#28a745'), flex: 1 }}>📦 Order Units</button>
              <a href={`tel:${b.phone_number}`} style={{ ...btn('#007bff'), flex: 1, textAlign: 'center', textDecoration: 'none', lineHeight: '22px' }}>Call Bank</a>
              <button onClick={() => share(`BLOOD BANK STOCK: ${b.facility_name} has ${b.units_available} units of ${b.blood_group} available at ₹${b.cost_per_unit}/unit. City: ${b.city}. Phone: ${b.phone_number}`)} style={{ ...btn('#25D366'), flex: 1 }}>WhatsApp</button>
            </div>
          </div>
        ))
      ) : list.map((d: any) => {
        const fee = Number(d.fee_amount || 0);
        const isAvail = d.is_available !== false;
        const days = getDays(d.last_donated_date);
        const eligible = days >= 90;
        const isStarred = starred.includes(d.id);

        return (
          <div key={d.id} style={{ border: darkMode ? '1px solid #333' : '1px solid #ddd', padding: '10px', borderRadius: '6px', marginBottom: '8px', background: isAvail ? (darkMode ? '#1e1e1e' : '#fff') : (darkMode ? '#161616' : '#f8f9fa'), opacity: isAvail ? 1 : 0.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b>{d.full_name}</b>
                  <button onClick={() => toggleStar(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}>{isStarred ? '⭐' : '☆'}</button>
                </div>
                <div style={{ color: fee > 0 ? '#d9534f' : '#28a745', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                  {fee > 0 ? `💰 Fee: ₹${fee}` : '💚 Free'} {d.donation_count > 1 && `| ⭐ ${d.donation_count}x`}
                </div>
              </div>
              <span style={{ background: '#d9534f', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{d.blood_group}</span>
            </div>
            <p style={{ margin: '4px 0', fontSize: '13px', color: darkMode ? '#aaa' : '#555' }}>📍 {d.city} {d.dist !== undefined && `(${d.dist} km)`} | 📞 {d.phone_number}</p>
            <div style={{ fontSize: '11px', marginBottom: '6px', fontWeight: 'bold', color: eligible ? '#28a745' : '#d9534f' }}>
              {eligible ? '✅ Eligible' : `⏳ Recent (${90 - days}d left)`}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              <button onClick={() => updateDonor(d.id, { is_available: !isAvail })} style={{ ...btn(isAvail ? '#2b4d36' : '#522b2b', isAvail ? '#a3e4c1' : '#f5b7b1') }}>{isAvail ? '🟢 Ready' : '🔴 Busy'}</button>
              <button onClick={() => updateDonor(d.id, { donation_count: (d.donation_count || 1) + 1, last_donated_date: new Date().toISOString().split('T')[0] })} style={btn(darkMode ? '#333' : '#e2e3e5', darkMode ? '#fff' : '#333')}>➕ Donated Today</button>
              <button onClick={() => updateDonor(d.id, { report_count: (d.report_count || 0) + 1 })} style={btn(darkMode ? '#423c1d' : '#fff3cd', darkMode ? '#fff' : '#333')}>🚩 Report ({d.report_count || 0})</button>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <a href={`tel:${d.phone_number}`} style={{ ...btn('#007bff'), flex: 1, textAlign: 'center', textDecoration: 'none' }}>Call</a>
              <button onClick={() => share(`DONOR: ${d.full_name} (${d.blood_group}) - Fee: ${fee > 0 ? `₹${fee}` : 'Free'} - Phone: ${d.phone_number}`)} style={{ ...btn('#25D366'), flex: 1 }}>WhatsApp</button>
              <button onClick={() => nav(d.lat, d.lng, d.city)} style={{ ...btn('#28a745'), flex: 1 }}>Route</button>
              <button onClick={() => { navigator.clipboard.writeText(d.phone_number); setUi({ ...ui, copiedId: d.id }); }} style={{ ...btn(ui.copiedId === d.id ? '#28a745' : (darkMode ? '#444' : '#6c757d')), flex: 1 }}>{ui.copiedId === d.id ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}