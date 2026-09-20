import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [donors, setDonors] = useState<any[]>([]);
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
    const matchesCity = donor.city?.toLowerCase().includes(searchCity.toLowerCase());
    const matchesGroup = selectedBloodGroup === 'ALL' || donor.blood_group === selectedBloodGroup;
    return matchesCity && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200 px-4 py-4 mb-6 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🚨</span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Lifeline Blood Directory</h1>
          </div>
          <span className="text-xs font-medium bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full border border-rose-100">
            Live Net
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-4">
        <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-100 space-y-3">
          <input
            type="text"
            placeholder="Search by city (e.g. Hyderabad)..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((group) => (
              <button
                key={group}
                onClick={() => setSelectedBloodGroup(group)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedBloodGroup === group
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400">Loading directory...</div>
        ) : filteredDonors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
            <p className="text-slate-500 text-sm">No donors found matching your search.</p>
          </div>
        ) : (
          filteredDonors.map((donor) => (
            <div
              key={donor.id || donor.phone}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 hover:shadow-md transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{donor.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    📍 {donor.city}
                  </p>
                </div>
                <span className="bg-rose-50 text-rose-600 font-extrabold text-sm px-3 py-1.5 rounded-xl border border-rose-100 shadow-xs">
                  {donor.blood_group}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  🟢 Ready
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-600">{donor.phone}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                <a
                  href={`tel:${donor.phone}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-all"
                >
                  📞 Call Donor
                </a>
                <a
                  href={`https://wa.me/${donor.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-all"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

