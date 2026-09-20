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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff5f5', color: '#111827', paddingBottom: '3rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '1.5rem 1rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Lifeline Blood Directory</h1>
          <p style={{ margin: 0, color: '#fee2e2', fontSize: '0.95rem' }}>Find or list verified blood donors in your area instantly</p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Filters */}
        <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fee2e2', display: 'flex', gap: '1rem', marginBottom: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <input
            type="text"
            placeholder="Search by city (e.g., Hyderabad)..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.95rem', outline: 'none' }}
          />
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.95rem', backgroundColor: '#ffffff', outline: 'none' }}
          >
            <option value="ALL">All Blood Groups</option>
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

        {/* List of Donors */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading donors...</div>
        ) : filteredDonors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #f3f4f6' }}>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', margin: 0 }}>No donors found matching your criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredDonors.map((donor) => (
              <div key={donor.id} style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '600', color: '#1f2937' }}>{donor.name}</h3>
                  <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.85rem' }}>
                    {donor.blood_group}
                  </span>
                </div>
                <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.9rem' }}>📍 {donor.city}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', backgroundColor: donor.available ? '#dcfce7' : '#f3f4f6', color: donor.available ? '#15803d' : '#4b5563' }}>
                    {donor.available ? 'Available' : 'Unavailable'}
                  </span>
                  <a
                    href={`tel:${donor.phone}`}
                    style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '0.4rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '500', textDecoration: 'none' }}
                  >
                    Call Donor
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
