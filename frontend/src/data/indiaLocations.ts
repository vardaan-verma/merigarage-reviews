/**
 * Comprehensive Indian States, Union Territories, and Major Automotive Hub Cities.
 * Covers all 28 States and 8 Union Territories of the Republic of India.
 */

export interface StateLocationData {
  state: string;
  isUnionTerritory?: boolean;
  cities: string[];
}

export const INDIA_LOCATIONS: StateLocationData[] = [
  // ─── 28 States ─────────────────────────────────────────────────────────────
  {
    state: 'Andhra Pradesh',
    cities: [
      'Visakhapatnam',
      'Vijayawada',
      'Guntur',
      'Nellore',
      'Kurnool',
      'Tirupati',
      'Rajahmundry',
      'Kakinada',
      'Anantapur',
      'Kadapa',
    ],
  },
  {
    state: 'Arunachal Pradesh',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
  },
  {
    state: 'Assam',
    cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  },
  {
    state: 'Bihar',
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif'],
  },
  {
    state: 'Chhattisgarh',
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
  },
  {
    state: 'Goa',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  },
  {
    state: 'Gujarat',
    cities: [
      'Ahmedabad',
      'Surat',
      'Vadodara',
      'Rajkot',
      'Bhavnagar',
      'Jamnagar',
      'Gandhinagar',
      'Anand',
      'Morbi',
      'Vapi',
    ],
  },
  {
    state: 'Haryana',
    cities: [
      'Gurugram',
      'Faridabad',
      'Panipat',
      'Ambala',
      'Karnal',
      'Hisar',
      'Rohtak',
      'Sonipat',
      'Panchkula',
      'Yamunanagar',
      'Rewari',
      'Manesar',
    ],
  },
  {
    state: 'Himachal Pradesh',
    cities: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Baddi', 'Bilaspur'],
  },
  {
    state: 'Jharkhand',
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  },
  {
    state: 'Karnataka',
    cities: [
      'Bengaluru',
      'Mysuru',
      'Hubballi-Dharwad',
      'Mangaluru',
      'Belagavi',
      'Davanagere',
      'Ballari',
      'Shivamogga',
      'Tumakuru',
    ],
  },
  {
    state: 'Kerala',
    cities: [
      'Thiruvananthapuram',
      'Kochi',
      'Kozhikode',
      'Thrissur',
      'Kollam',
      'Palakkad',
      'Alappuzha',
      'Kannur',
      'Kottayam',
    ],
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      'Indore',
      'Bhopal',
      'Jabalpur',
      'Gwalior',
      'Ujjain',
      'Sagar',
      'Dewas',
      'Satna',
      'Ratlam',
    ],
  },
  {
    state: 'Maharashtra',
    cities: [
      'Mumbai',
      'Pune',
      'Nagpur',
      'Thane',
      'Nashik',
      'Aurangabad (Chhatrapati Sambhaji Nagar)',
      'Navi Mumbai',
      'Solapur',
      'Kolhapur',
      'Amravati',
      'Pimpri-Chinchwad',
    ],
  },
  {
    state: 'Manipur',
    cities: ['Imphal', 'Churachandpur', 'Thoubal'],
  },
  {
    state: 'Meghalaya',
    cities: ['Shillong', 'Tura', 'Jowai'],
  },
  {
    state: 'Mizoram',
    cities: ['Aizawl', 'Lunglei', 'Champhai'],
  },
  {
    state: 'Nagaland',
    cities: ['Kohima', 'Dimapur', 'Mokokchung'],
  },
  {
    state: 'Odisha',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  },
  {
    state: 'Punjab',
    cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  },
  {
    state: 'Rajasthan',
    cities: [
      'Jaipur',
      'Jodhpur',
      'Kota',
      'Bikaner',
      'Ajmer',
      'Udaipur',
      'Bhilwara',
      'Alwar',
      'Sikar',
      'Bharatpur',
    ],
  },
  {
    state: 'Sikkim',
    cities: ['Gangtok', 'Namchi', 'Geyzing'],
  },
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Tiruchirappalli',
      'Salem',
      'Tiruppur',
      'Erode',
      'Vellore',
      'Tirunelveli',
      'Thoothukudi',
    ],
  },
  {
    state: 'Telangana',
    cities: [
      'Hyderabad',
      'Warangal',
      'Nizamabad',
      'Karimnagar',
      'Khammam',
      'Ramagundam',
      'Secunderabad',
    ],
  },
  {
    state: 'Tripura',
    cities: ['Agartala', 'Dharmanagar', 'Udaipur'],
  },
  {
    state: 'Uttar Pradesh',
    cities: [
      'Lucknow',
      'Kanpur',
      'Ghaziabad',
      'Noida',
      'Greater Noida',
      'Agra',
      'Varanasi',
      'Meerut',
      'Prayagraj',
      'Bareilly',
      'Aligarh',
      'Moradabad',
      'Saharanpur',
      'Gorakhpur',
    ],
  },
  {
    state: 'Uttarakhand',
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Kashipur'],
  },
  {
    state: 'West Bengal',
    cities: ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Kharagpur'],
  },

  // ─── 8 Union Territories ───────────────────────────────────────────────────
  {
    state: 'Andaman and Nicobar Islands',
    isUnionTerritory: true,
    cities: ['Port Blair'],
  },
  {
    state: 'Chandigarh',
    isUnionTerritory: true,
    cities: ['Chandigarh'],
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    isUnionTerritory: true,
    cities: ['Daman', 'Diu', 'Silvassa'],
  },
  {
    state: 'Delhi',
    isUnionTerritory: true,
    cities: [
      'Delhi',
      'New Delhi',
      'Central Delhi',
      'North Delhi',
      'South Delhi',
      'West Delhi',
      'East Delhi',
      'Dwarka',
      'Rohini',
    ],
  },
  {
    state: 'Jammu and Kashmir',
    isUnionTerritory: true,
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  },
  {
    state: 'Ladakh',
    isUnionTerritory: true,
    cities: ['Leh', 'Kargil'],
  },
  {
    state: 'Lakshadweep',
    isUnionTerritory: true,
    cities: ['Kavaratti', 'Agatti'],
  },
  {
    state: 'Puducherry',
    isUnionTerritory: true,
    cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  },
];

/**
 * Returns all Indian states and UTs in alphabetical order.
 */
export function getAllStates(): string[] {
  return INDIA_LOCATIONS.map((loc) => loc.state).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the list of major cities for a given state, or empty array if state not found.
 */
export function getCitiesForState(stateName?: string | null): string[] {
  if (!stateName) return [];
  const found = INDIA_LOCATIONS.find(
    (loc) => loc.state.toLowerCase() === stateName.trim().toLowerCase()
  );
  return found ? [...found.cities].sort((a, b) => a.localeCompare(b)) : [];
}

/**
 * Finds the matching state for a given city across India, if known.
 */
export function findStateForCity(cityName?: string | null): string | null {
  if (!cityName) return null;
  const clean = cityName.trim().toLowerCase();
  for (const loc of INDIA_LOCATIONS) {
    if (loc.cities.some((c) => c.toLowerCase() === clean)) {
      return loc.state;
    }
  }
  return null;
}
