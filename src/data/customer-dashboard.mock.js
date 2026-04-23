// src/data/customer-dashboard.mock.js

// Small helpers so we don't crash if a consumer expects strings
const safe = (v, d = "—") => (v ?? d);

export const customerProfile = {
  id: "cust_001",
  name: "John Smith",
  email: "john.smith@example.com",
  phone: "(555) 123-4567",
  address: "123 Main St, Atlanta, GA 30301",
  company: "Smith Logistics Inc.",
  verified: { email: true, phone: false },
  completionStatus: { isComplete: false, missingFields: ["phone verification", "billing info"] },
};

/**
 * ACTIVE SHIPMENTS (what renders at the top table)
 * Each item already includes the extra details the Load Details Modal expects.
 */
export const activeShipments = [
  {
    id: "SHP-2025-001",
    fromZip: "30301",
    fromCity: "Atlanta, GA",
    toZip: "90210",
    toCity: "Beverly Hills, CA",
    miles: 2175,
    price: 1250,
    ratePerMile: 0.57,
    vehicle: "2022 Toyota Camry",
    transportType: "Open",
    status: "accepted",
    etaDays: 2,
    etaDate: "2025-09-23",
    pickupDate: "2025-09-20",
    stops: 0,
    pickup: {
      name: "Customer Residence",
      address: "123 Main St, Atlanta, GA 30301",
      window: "8:00 AM – 12:00 PM",
      notes: "Call 30 minutes before arrival; narrow driveway."
    },
    dropoff: {
      name: "Beverly Hills Residence",
      address: "455 N Rexford Dr, Beverly Hills, CA 90210",
      window: "Next day by 5:00 PM",
      notes: "No alley access; street parking only."
    },
    contact: {
      broker: "Kaku Dispatch",
      phone: "(310) 555-2025",
      email: "support@kaku.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Customer prefers evening pickup if possible."
  },
  {
    id: "SHP-2025-002",
    fromZip: "60601",
    fromCity: "Chicago, IL",
    toZip: "33101",
    toCity: "Miami, FL",
    miles: 1381,
    price: 980,
    ratePerMile: 0.71,
    vehicle: "2021 Ford F-150",
    transportType: "Open",
    status: "accepted",
    etaDays: 3,
    etaDate: "2025-09-24",
    pickupDate: "2025-09-21",
    stops: 0,
    pickup: {
      name: "Downtown Garage",
      address: "123 W Lake St, Chicago, IL 60601",
      window: "9:00 AM – 1:00 PM",
      notes: "Gate code 4242#; height limit 7'."
    },
    dropoff: {
      name: "Wynwood",
      address: "2600 NW 2nd Ave, Miami, FL 33101",
      window: "By 6:00 PM",
      notes: "Receiver: Ana (front desk)."
    },
    contact: {
      broker: "Kaku Dispatch",
      phone: "(786) 555-1188",
      email: "dispatch@kaku.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Toll transponder in vehicle; please leave inside."
  }
];

/**
 * QUOTE HISTORY
 * More descriptive rows (addresses/notes) so your expanded modal / future flows can reuse them.
 */
export const quoteHistory = [
  {
    id: "QT-2025-008",
    fromZip: "73301",
    fromCity: "Austin, TX",
    toZip: "37201",
    toCity: "Nashville, TN",
    distance: 856,
    vehicle: "2022 Mazda CX-5",
    offer: 920,
    likelihood: 82,
    createdDate: "2025-09-20",
    status: "waiting",
    pickup: {
      name: "South Congress Residence",
      address: "1500 S Congress Ave, Austin, TX 73301",
      window: "Morning",
      notes: "Text on arrival; dog on premises."
    },
    dropoff: {
      name: "Downtown Garage",
      address: "333 Commerce St, Nashville, TN 37201",
      window: "Same/next day",
      notes: "Ticket will be validated."
    }
  },
  {
    id: "QT-2025-007",
    fromZip: "89101",
    fromCity: "Las Vegas, NV",
    toZip: "97201",
    toCity: "Portland, OR",
    distance: 1018,
    vehicle: "2023 Jeep Wrangler",
    offer: 1100,
    likelihood: 78,
    createdDate: "2025-09-19",
    status: "waiting",
    pickup: {
      name: "Vegas Auto Gallery",
      address: "777 Las Vegas Blvd, Las Vegas, NV 89101",
      window: "ASAP",
      notes: "24/7 receiving."
    },
    dropoff: {
      name: "Pearl District Lot",
      address: "123 NW 10th Ave, Portland, OR 97201",
      window: "Business hours",
      notes: ""
    }
  },
  {
    id: "QT-2025-006",
    fromZip: "02101",
    fromCity: "Boston, MA",
    toZip: "20001",
    toCity: "Washington, DC",
    distance: 434,
    vehicle: "2021 BMW X5",
    offer: 550,
    likelihood: 35,
    createdDate: "2025-09-18",
    status: "waiting",
    pickup: {
      name: "Beacon Garage",
      address: "24 Beacon St, Boston, MA 02108",
      window: "8 AM – 12 PM",
      notes: ""
    },
    dropoff: {
      name: "Union Station",
      address: "50 Massachusetts Ave NE, Washington, DC 20002",
      window: "Next day",
      notes: ""
    }
  },
  {
    id: "QT-2025-005",
    fromZip: "85001",
    fromCity: "Phoenix, AZ",
    toZip: "80201",
    toCity: "Denver, CO",
    distance: 865,
    vehicle: "2022 Chevrolet Silverado",
    offer: 750,
    likelihood: 68,
    createdDate: "2025-09-17",
    status: "waiting",
    pickup: { name: "Phoenix Motors", address: "111 Central Ave, Phoenix, AZ 85001" },
    dropoff: { name: "Denver Dealership", address: "890 Broadway, Denver, CO 80201" }
  },
  {
    id: "QT-2025-004",
    fromZip: "75201",
    fromCity: "Dallas, TX",
    toZip: "98101",
    toCity: "Seattle, WA",
    distance: 2122,
    vehicle: "2020 Honda Accord",
    offer: 850,
    likelihood: 45,
    createdDate: "2025-09-16",
    status: "waiting",
    pickup: { name: "Park Cities Dealer", address: "2000 McKinney Ave, Dallas, TX 75201" },
    dropoff: { name: "Belltown", address: "2001 4th Ave, Seattle, WA 98101" }
  },
  {
    id: "QT-2025-003",
    fromZip: "10001",
    fromCity: "New York, NY",
    toZip: "94102",
    toCity: "San Francisco, CA",
    distance: 2906,
    vehicle: "2023 Tesla Model 3",
    offer: 1650,
    likelihood: 90,
    createdDate: "2025-09-15",
    status: "accepted",
    pickup: { name: "Chelsea Garage", address: "400 W 23rd St, New York, NY 10001" },
    dropoff: { name: "SOMA Lot", address: "99 8th St, San Francisco, CA 94103" }
  },
  {
    id: "QT-2025-002",
    fromZip: "60601",
    fromCity: "Chicago, IL",
    toZip: "33101",
    toCity: "Miami, FL",
    distance: 1381,
    vehicle: "2021 Ford F-150",
    offer: 980,
    likelihood: 72,
    createdDate: "2025-09-14",
    status: "accepted",
    pickup: { name: "Downtown Garage", address: "123 W Lake St, Chicago, IL 60601" },
    dropoff: { name: "Wynwood", address: "2600 NW 2nd Ave, Miami, FL 33101" }
  },
  {
    id: "QT-2025-001",
    fromZip: "30301",
    fromCity: "Atlanta, GA",
    toZip: "90210",
    toCity: "Beverly Hills, CA",
    distance: 2175,
    vehicle: "2022 Toyota Camry",
    offer: 1250,
    likelihood: 85,
    createdDate: "2025-09-13",
    status: "accepted",
    pickup: { name: "Customer Residence", address: "123 Main St, Atlanta, GA 30301" },
    dropoff: { name: "Beverly Hills Residence", address: "455 N Rexford Dr, Beverly Hills, CA 90210" }
  }
];

export const dashboardStats = {
  totalQuotes: quoteHistory.length,
  acceptedQuotes: quoteHistory.filter(q => q.status === "accepted").length,
  averageLikelihood: Math.round(
    quoteHistory.reduce((a, q) => a + q.likelihood, 0) / quoteHistory.length
  ),
  totalSpent: quoteHistory
    .filter(q => q.status === "accepted")
    .reduce((a, q) => a + q.offer, 0),
  activeShipmentsCount: activeShipments.length,
  pendingQuotesCount: quoteHistory.filter(q => q.status === "waiting").length,
};