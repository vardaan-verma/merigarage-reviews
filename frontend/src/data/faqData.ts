export interface FaqItem {
  id: string;
  category: FaqCategory;
  categorySlug: string;
  badgeText: string;
  question: string;
  answer: string;
  keyPoints?: { icon: string; title: string; desc: string }[];
  actionLink?: { label: string; url: string; isExternal?: boolean };
}

export type FaqCategory =
  | 'Finding Garages'
  | 'Reviews & Ratings'
  | 'Quotes & Services'
  | 'Garage Owners & Claims'
  | 'Accounts & Profiles';

export const FAQ_CATEGORIES: FaqCategory[] = [
  'Finding Garages',
  'Reviews & Ratings',
  'Quotes & Services',
  'Garage Owners & Claims',
  'Accounts & Profiles',
];

export const FAQ_DATA: FaqItem[] = [
  // --- FINDING GARAGES ---
  {
    id: 'faq-1',
    category: 'Finding Garages',
    categorySlug: 'finding-garages',
    badgeText: 'Discovery',
    question: 'What is MeriGarage and how does it help car owners?',
    answer:
      'MeriGarage is India’s dedicated automotive workshop discovery and verified review platform. We help vehicle owners find dependable independent garages, compare verified customer ratings across 4 quality pillars, view transparent pricing, and connect directly with trusted local mechanics without middleman commissions.',
    keyPoints: [
      {
        icon: 'verified',
        title: 'Verified Workshops',
        desc: 'Audited physical locations and verified mechanic credentials.',
      },
      {
        icon: 'star',
        title: 'Transparent Ratings',
        desc: 'Unbiased reviews rated across service quality, price, speed, and communication.',
      },
    ],
    actionLink: {
      label: 'Explore Garages Near You',
      url: '/garages',
    },
  },
  {
    id: 'faq-2',
    category: 'Finding Garages',
    categorySlug: 'finding-garages',
    badgeText: 'Search & Filters',
    question: 'How do I find garages near me for specific car repair services?',
    answer:
      'Head to the Explore Garages page where you can filter listings by Indian cities (Delhi, Mumbai, Bengaluru, Pune, Hyderabad, and more) or choose specific service categories like Periodic Service, Brake Repair, AC Servicing, Wheel Alignment, and Engine Diagnostics. You can also sort by highest customer rating or total reviews.',
    actionLink: {
      label: 'Browse Service Catalogue',
      url: '/services',
    },
  },
  {
    id: 'faq-3',
    category: 'Finding Garages',
    categorySlug: 'finding-garages',
    badgeText: '4-Pillar Ratings',
    question: 'How does MeriGarage calculate a garage’s rating and customer reviews?',
    answer:
      'MeriGarage uses a structured 4-pillar review system to provide deep, balanced insights beyond generic star ratings: Service Quality, Pricing Transparency, Timely Delivery, and Customer Communication. Each customer review includes these four pillar scores, written feedback, and optional photo attachments from actual service visits.',
    keyPoints: [
      {
        icon: 'build',
        title: 'Service Quality',
        desc: 'Workmanship standard and technical competence.',
      },
      {
        icon: 'payments',
        title: 'Pricing Transparency',
        desc: 'Clarity of estimates with no hidden charges.',
      },
      {
        icon: 'schedule',
        title: 'Timely Delivery',
        desc: 'Adherence to promised completion timelines.',
      },
      {
        icon: 'chat',
        title: 'Communication',
        desc: 'Proactive updates and respectful service advisors.',
      },
    ],
    actionLink: {
      label: 'View Highest Rated Garages',
      url: '/garages',
    },
  },
  {
    id: 'faq-4',
    category: 'Finding Garages',
    categorySlug: 'finding-garages',
    badgeText: 'Direct Contact',
    question: 'How can I contact a garage or visit their workshop?',
    answer:
      'Every garage detail page provides the workshop’s complete verified street address, phone number, working hours, and direct WhatsApp links. You can also click the "Request Quote" button directly on the garage profile to send an inquiry with your car details.',
    actionLink: {
      label: 'Find a Workshop',
      url: '/garages',
    },
  },

  // --- REVIEWS & RATINGS ---
  {
    id: 'faq-5',
    category: 'Reviews & Ratings',
    categorySlug: 'reviews-ratings',
    badgeText: 'Community Trust',
    question: 'How do I submit or edit a review for a workshop I visited?',
    answer:
      'To submit a review, log in to your MeriGarage account, visit the workshop’s page, and click "Write a Review". You will be asked to rate the 4 service pillars, detail the services performed, and optionally upload service photos. You can view, edit, or update your submitted reviews anytime from your My Reviews page.',
    actionLink: {
      label: 'Manage My Reviews',
      url: '/my-reviews',
    },
  },
  {
    id: 'faq-6',
    category: 'Reviews & Ratings',
    categorySlug: 'reviews-ratings',
    badgeText: 'Verification',
    question: 'What does the Verified Workshop badge mean on a garage profile?',
    answer:
      'The "Verified" badge is awarded to garages whose business registrations, trade licenses, physical presence, and contact information have been reviewed and approved by the MeriGarage verification team. This guarantees that the workshop exists at the stated address and is open for business.',
  },
  {
    id: 'faq-7',
    category: 'Reviews & Ratings',
    categorySlug: 'reviews-ratings',
    badgeText: 'Ownership Trust',
    question: 'What is the difference between a Claimed and an Unclaimed garage listing?',
    answer:
      'An Unclaimed listing is a directory entry created from public records or community suggestions. A Claimed listing means the official workshop proprietor has verified their ownership with our administrative team. Claimed garages can manage their service offerings, update operating hours, upload photos, and respond officially to customer reviews.',
    actionLink: {
      label: 'List or Claim a Workshop',
      url: '/submit-garage',
    },
  },

  // --- QUOTES & SERVICES ---
  {
    id: 'faq-8',
    category: 'Quotes & Services',
    categorySlug: 'quotes-services',
    badgeText: 'Estimates',
    question: 'How do I request an estimate or quote from a garage?',
    answer:
      'Open the garage’s profile and click "Request Quote". Select the required services (e.g. Periodic Maintenance, Brake Service, AC Repair, Diagnostics), choose one of your saved vehicles or enter new vehicle details, and describe any symptoms or specific requests. The garage receives your inquiry and responds with estimated costs and turnaround time.',
    actionLink: {
      label: 'Browse Garages to Request Quote',
      url: '/garages',
    },
  },
  {
    id: 'faq-9',
    category: 'Quotes & Services',
    categorySlug: 'quotes-services',
    badgeText: 'Quote Tracking',
    question: 'Where can I see responses to the quotes I requested?',
    answer:
      'Once logged in as a vehicle owner, navigate to "My Asked Quotes" in the top navigation bar. Here you can track all submitted quote requests, view garage status updates (Pending, Quoted, Accepted, Rejected), compare pricing estimates, and read response notes provided by the workshop.',
    actionLink: {
      label: 'View My Asked Quotes',
      url: '/my-asked-quotes',
    },
  },
  {
    id: 'faq-10',
    category: 'Quotes & Services',
    categorySlug: 'quotes-services',
    badgeText: 'Vehicle Garage',
    question: 'Can I manage multiple saved vehicles in my profile?',
    answer:
      'Yes! MeriGarage allows car owners to maintain a virtual garage of their vehicles under My Profile. You can add multiple cars with make, model, year, fuel type, and registration numbers. When requesting quotes, you can pick any of your saved vehicles with a single click.',
    actionLink: {
      label: 'Manage Vehicles in Profile',
      url: '/profile',
    },
  },

  // --- GARAGE OWNERS & CLAIMS ---
  {
    id: 'faq-11',
    category: 'Garage Owners & Claims',
    categorySlug: 'garage-owners',
    badgeText: 'Partner Network',
    question: 'How do I register as a Garage Owner on MeriGarage?',
    answer:
      'Visit the Register page and select the "Garage Owner" account option during sign up. If you already have an account, make sure to select the "Garage Owner Login" tab on the Login page to access workshop-specific management tools.',
    actionLink: {
      label: 'Create Garage Owner Account',
      url: '/register',
    },
  },
  {
    id: 'faq-12',
    category: 'Garage Owners & Claims',
    categorySlug: 'garage-owners',
    badgeText: 'Listing Claim',
    question: 'How do I claim an existing garage listing that belongs to my business?',
    answer:
      'Search for your garage on the Explore Garages page. On your workshop profile, click the "Claim This Garage" button. You will be prompted to provide ownership details and verification documents (such as GSTIN, trade license, or business registration). You can monitor your claim status under My Claims.',
    actionLink: {
      label: 'Check My Claims',
      url: '/my-claims',
    },
  },
  {
    id: 'faq-13',
    category: 'Garage Owners & Claims',
    categorySlug: 'garage-owners',
    badgeText: 'Owner Hub',
    question: 'How can I update my workshop details, services, and photos?',
    answer:
      'Once your claim or listing is verified, log in as a Garage Owner and open the Owner Hub. From this centralized dashboard, you can update your business address, opening hours, contact numbers, toggle offered services, upload high-resolution workshop photos, and manage customer inquiries.',
    actionLink: {
      label: 'Open Owner Hub',
      url: '/owner',
    },
  },
  {
    id: 'faq-14',
    category: 'Garage Owners & Claims',
    categorySlug: 'garage-owners',
    badgeText: 'Leads & Inquiries',
    question: 'How do I receive and respond to customer quote requests?',
    answer:
      'Incoming quote requests from vehicle owners appear in your "My Quotes" dashboard. You can review the vehicle symptoms, calculate estimated parts and labor costs, propose an estimated delivery timeframe, and send your quote directly back to the customer.',
    actionLink: {
      label: 'Go to My Quotes Console',
      url: '/my-quotes',
    },
  },

  // --- ACCOUNTS & PROFILES ---
  {
    id: 'faq-15',
    category: 'Accounts & Profiles',
    categorySlug: 'accounts-profiles',
    badgeText: 'Account Settings',
    question: 'How do I update my profile details and upload an avatar photo?',
    answer:
      'Click your profile avatar or name in the navigation bar to visit My Profile. Here you can edit your full name, phone number, bio, and upload a custom profile picture (JPEG, PNG, or WebP up to 5MB). Your avatar is displayed on all your reviews and quotes.',
    actionLink: {
      label: 'Visit Profile Settings',
      url: '/profile',
    },
  },
  {
    id: 'faq-16',
    category: 'Accounts & Profiles',
    categorySlug: 'accounts-profiles',
    badgeText: 'Role Portals',
    question: 'Which login portal should I use: Customer or Garage Owner?',
    answer:
      'MeriGarage provides dedicated portals tailored to user roles. If you are a car owner looking for repair services, requesting quotes, or writing reviews, use the "Customer Login" portal. If you run a workshop and need to manage listings, claims, or quotes, use the "Garage Owner Login" portal.',
    actionLink: {
      label: 'Go to Login Portal',
      url: '/login',
    },
  },
  {
    id: 'faq-17',
    category: 'Accounts & Profiles',
    categorySlug: 'accounts-profiles',
    badgeText: 'Security & Access',
    question: 'What happens if I log in with the wrong portal tab?',
    answer:
      'If you try logging into the Garage Owner portal with a Vehicle Owner account (or vice versa), our authentication system detects the role mismatch and displays a helpful prompt inviting you to switch to the correct tab. Your credentials remain safe and secure.',
    actionLink: {
      label: 'Switch Login Tab',
      url: '/login',
    },
  },
];
