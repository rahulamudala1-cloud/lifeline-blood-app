import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface Donor {
  id: number;
  name: string;
  blood_group: string;
  city: string;
  phone: string;
  available: boolean;
}

export default function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
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
    return matchesCity && matchesGroup;
  });

  const uniqueCities = new Set(donors.map(d => d.city)).size;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '3rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Zomato/Swiggy Style Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🚨</span>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ef4444', margin: 0, letterSpacing: '-0.025em' }}>Emergency Blood Directory</h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Connecting lives in real-time</p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
            LIVE SYSTEM
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '700px', margin: '1.25rem auto', padding: '0 1rem' }}>
        
        {/* Statistics Bar (Zomato pill metrics) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>{donors.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Verified Donors</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ef4444' }}>1</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Active Alerts</div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>{uniqueCities}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Cities Covered</div>
          </div>
        </div>

        {/* Quick Swiggy/Zomato Style Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <a 
            href="tel:108" 
            style={{ 
              backgroundColor: '#dc2626', color: '#ffffff', padding: '0.75rem', textAlign: 'center', borderRadius: '0.75rem', 
              fontSize: '0.9rem', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}
          >
            🚑 108 Emergency
          </a>
          <button 
            onClick={() => setShowBroadcastModal(true)}
            style={{ 
              backgroundColor: '#f59e0b', color: '#ffffff', padding: '0.75rem', textAlign: 'center', borderRadius: '0.75rem', 
              fontSize: '0.9rem', fontWeight: '700', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}
          >
            📢 Order / Broadcast Request
          </button>
        </div>

        {/* Broadcast Modal Popup */}
        {showBroadcastModal && (
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '0.75rem', border: '2px solid #f59e0b', marginBottom: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: '700', color: '#b45309' }}>📢 Broadcast Blood Request</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Patient Name & Hospital" 
                value={patientName} 
                onChange={(e) => setPatientName(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={requiredGroup} 
                  onChange={(e) => setRequiredGroup(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', backgroundColor: '#fff' }}
                >
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
                <input 
                  type="text" 
                  placeholder="City (e.g. Hyderabad)" 
                  value={hospitalCity} 
                  onChange={(e) => setHospitalCity(e.target.value)}
                  style={{ flex: 2, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => { alert(`Broadcast sent for ${requiredGroup} in ${hospitalCity || 'city'}!`); setShowBroadcastModal(false); }}
                style={{ flex: 1, backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Send Broadcast
              </button>
              <button 
                onClick={() => setShowBroadcastModal(false)}
                style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <input
            type="text"
            placeholder="Search by city..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
          />
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', backgroundColor: '#ffffff', outline: 'none', fontWeight: '600' }}
          >
            <option value="ALL">ALL GROUPS</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        {/* Donor Cards List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontWeight: '600' }}>Loading directory...</div>
        ) : filteredDonors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', margin: 0, fontWeight: '500' }}>No donors found matching criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredDonors.map((donor) => (
              <div key={donor.id} style={{ backgroundColor: '#ffffff', padding: '1.15rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>{donor.name}</span>
                  <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.85rem' }}>
                    {donor.blood_group}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>📍 {donor.city}</span>
                  <span>📞 {donor.phone}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '999px', backgroundColor: donor.available ? '#dcfce7' : '#f1f5f9', color: donor.available ? '#16a34a' : '#64748b', fontWeight: '700' }}>
                    {donor.available ? '● Ready Now' : '● Unavailable'}
                  </span>
                </div>

                {/* Zomato/Swiggy Pill Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <a 
                    href={`tel:${donor.phone}`} 
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', textAlign: 'center', padding: '0.5rem 0', borderRadius: '0.5rem', fontSize: '0.8rem', textDecoration: 'none', fontWeight: '700', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
                  >
                    Call
                  </a>
                  <a 
                    href={`https://wa.me/${donor.phone}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ backgroundColor: '#16a34a', color: '#ffffff', textAlign: 'center', padding: '0.5rem 0', borderRadius: '0.5rem', fontSize: '0.8rem', textDecoration: 'none', fontWeight: '700', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }}
                  >
                    WhatsApp
                  </a>
                  <button 
                    onClick={() => alert(`Directions to ${donor.city}`)} 
                    style={{ backgroundColor: '#ca8a04', color: '#ffffff', border: 'none', padding: '0.5rem 0', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(202, 138, 4, 0.2)' }}
                  >
                    Route
                  </button>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(donor.phone); alert('Phone number copied!'); }} 
                    style={{ backgroundColor: '#64748b', color: '#ffffff', border: 'none', padding: '0.5rem 0', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(100, 116, 139, 0.2)' }}
                  >
                    Copy
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
