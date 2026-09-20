import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface Donor {
  id: number;
  name?: string;
  full_name?: string;
  blood_group: string;
  city: string;
  phone: string;
  available: boolean;
}

export default function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [requiredGroup, setRequiredGroup] = useState('A+');
  const [hospitalCity, setHospitalCity] = useState('');

  useEffect(() => {
    fetchDonors();
  }, []);

  async function fetchDonors() {
    setLoading(true);
    const { data, error } = await supabase.from('donors').select('*');
    if (error) {
      console.error('Error fetching donors:', error);
    } else {
      setDonors(data || []);
    }
    setLoading(false);
  }

  const filteredDonors = donors.filter((donor) => {
    const matchesCity = donor.city ? donor.city.toLowerCase().includes(searchCity.toLowerCase()) : false;
    const matchesGroup = selectedBloodGroup === 'ALL' || donor.blood_group === selectedBloodGroup;
    
    if (filterType === 'READY' && !donor.available) return false;
    return matchesCity && matchesGroup;
  });

  const uniqueCities = new Set(donors.map(d => d.city)).size;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '3rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ef4444', margin: 0 }}>Emergency Blood Directory</h1>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Connecting lives in real-time</p>
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
            LIVE
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '650px', margin: '1rem auto', padding: '0 0.75rem' }}>
        
        {/* Statistics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem', textAlign: 'center', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{donors.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Donors</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem', textAlign: 'center', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ef4444' }}>1</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Active Alerts</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '0.65rem', textAlign: 'center', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{uniqueCities}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Cities</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <a href="tel:108" style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '0.6rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none' }}>
            🚑 108 Emergency
          </a>
          <button onClick={() => setShowBroadcastModal(true)} style={{ backgroundColor: '#f59e0b', color: '#ffffff', padding: '0.6rem', border: 'none', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
            📢 Broadcast Request
          </button>
        </div>

        {/* Broadcast Modal */}
        {showBroadcastModal && (
          <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '2px solid #f59e0b', marginBottom: '0.85rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '700', color: '#b45309' }}>Broadcast Blood Request</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <input type="text" placeholder="Patient Name & Hospital" value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <select value={requiredGroup} onChange={(e) => setRequiredGroup(e.target.value)} style={{ flex: 1, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', backgroundColor: '#fff' }}>
                  <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
                <input type="text" placeholder="City" value={hospitalCity} onChange={(e) => setHospitalCity(e.target.value)} style={{ flex: 2, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => { alert(`Broadcast sent!`); setShowBroadcastModal(false); }} style={{ flex: 1, backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '0.375rem', fontWeight: '700', cursor: 'pointer' }}>Send</button>
              <button onClick={() => setShowBroadcastModal(false)} style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Search & Main Filter Bar */}
        <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <input type="text" placeholder="Search City..." value={searchCity} onChange={(e) => setSearchCity(e.target.value)} style={{ flex: 1, padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', outline: 'none' }} />
          <select value={selectedBloodGroup} onChange={(e) => setSelectedBloodGroup(e.target.value)} style={{ padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: '600', outline: 'none' }}>
            <option value="ALL">ALL GROUPS</option>
            <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
          </select>
        </div>

        {/* Sub-Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.85rem' }}>
          <button onClick={() => setFilterType('ALL')} style={{ padding: '0.3rem 0.6rem', borderRadius: '999px', border: 'none', backgroundColor: filterType === 'ALL' ? '#0f172a' : '#e2e8f0', color: filterType === 'ALL' ? '#fff' : '#475569', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🔍 All Donors
          </button>
          <button onClick={() => setFilterType('READY')} style={{ padding: '0.3rem 0.6rem', borderRadius: '999px', border: 'none', backgroundColor: filterType === 'READY' ? '#16a34a' : '#e2e8f0', color: filterType === 'READY' ? '#fff' : '#475569', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🟢 Ready Now
          </button>
        </div>

        {/* Donor List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</div>
        ) : filteredDonors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>No matching donors found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredDonors.map((donor) => (
              <div key={donor.id} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                
                {/* Donor Name & Blood Group Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                      {donor.name || donor.full_name || 'Unnamed Donor'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '0.1rem' }}>💚 Free | ⭐ 5x</div>
                  </div>
                  <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem' }}>
                    {donor.blood_group}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                  📍 {donor.city} | 📞 {donor.phone}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  <span style={{ backgroundColor: donor.available ? '#dcfce7' : '#f1f5f9', color: donor.available ? '#16a34a' : '#64748b', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                    {donor.available ? '● Ready' : '● Unavailable'}
                  </span>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>
                    ✅ Eligible
                  </span>
                </div>

                {/* Swiggy/Zomato Style Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  <a href={`tel:${donor.phone}`} style={{ backgroundColor: '#2563eb', color: '#fff', textAlign: 'center', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>Call</a>
                  <a href={`https://wa.me/${donor.phone}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#16a34a', color: '#fff', textAlign: 'center', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', textDecoration: 'none', fontWeight: '700' }}>WhatsApp</a>
                  <button onClick={() => alert(`Route to ${donor.city}`)} style={{ backgroundColor: '#ca8a04', color: '#fff', border: 'none', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Route</button>
                  <button onClick={() => { navigator.clipboard.writeText(donor.phone); alert('Copied!'); }} style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '0.4rem 0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Copy</button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
