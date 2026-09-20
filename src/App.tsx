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
    const matchesCity = donor.city.toLowerCase().includes(searchCity.toLowerCase());
    const matchesGroup = selectedBloodGroup === 'ALL' || donor.blood_group === selectedBloodGroup;
    return matchesCity && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-red-50 text-gray-900 pb-12">
      <header className="bg-red-600 text-white shadow-md py-6 px-4 mb-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-wide">Lifeline Blood Directory</h1>
          <p className="text-red-100 mt-1">Find or list verified blood donors in your area instantly</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* Search & Filter Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by city (e.g., Hyderabad)..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
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

        {/* Donors List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading donors...</div>
        ) : filteredDonors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-lg">No donors found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDonors.map((donor) => (
              <div key={donor.id} className="bg-white p-5 rounded-xl shadow-sm border border-red-100 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{donor.name}</h3>
                  <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-sm">
                    {donor.blood_group}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">📍 {donor.city}</p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${donor.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {donor.available ? 'Available' : 'Currently Unavailable'}
                  </span>
                  <a
                    href={`tel:${donor.phone}`}
                    className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition"
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
