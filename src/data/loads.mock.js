export const MOCK_LOADS = [
  {
    id: "LD-1001",
    ref: "REF-CHI-NYC-001",
    price: 950,
    miles: 790,
    ratePerMile: 1.20,
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    pickupDate: "2025-09-20",

    // Card summary
    origin: "Chicago, IL",
    originState: "IL",
    originZip: "60601",
    destination: "New York, NY",
    destState: "NY",
    destZip: "10001",
    vehicleType: "Sedan",
    transportType: "Open",

    // Modal details
    pickup: {
      name: "Downtown Garage",
      address: "123 W Lake St, Chicago, IL 60601",
      window: "8:00 AM - 12:00 PM",
      notes: "Call 30 min before arrival."
    },
    dropoff: {
      name: "Manhattan Lot",
      address: "450 10th Ave, New York, NY 10001",
      window: "Next day by 5:00 PM",
      notes: "Limited street parking."
    },
    contact: {
      broker: "FastTrack Transport",
      phone: "(917) 555-0456",
      email: "dispatch@fasttrack.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Residential drop-off okay. Flexible delivery window.",
    stops: 0
  },
  {
    id: "LD-1002",
    ref: "REF-DAL-LA-002",
    price: 2200,
    miles: 1435,
    ratePerMile: 1.53,
    postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    pickupDate: "2025-09-22",

    origin: "Dallas, TX",
    originState: "TX",
    originZip: "75201",
    destination: "Los Angeles, CA",
    destState: "CA",
    destZip: "90001",
    vehicleType: "SUV",
    transportType: "Enclosed",

    pickup: {
      name: "Dealer - Park Cities",
      address: "2000 McKinney Ave, Dallas, TX 75201",
      window: "9:00 AM - 2:00 PM",
      notes: "Enclosed transport only."
    },
    dropoff: {
      name: "Private Residence",
      address: "1200 Sunset Blvd, Los Angeles, CA 90001",
      window: "By Sept 28",
      notes: "Text 10 min prior to arrival."
    },
    contact: {
      broker: "RoadStar Logistics",
      phone: "(312) 555-0199",
      email: "ops@roadstar.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Must photograph vehicle pre/post transport. Enclosed only, must arrive by Sept 28.",
    stops: 1
  },
  {
    id: "LD-1003",
    ref: "REF-MIA-ATL-003",
    price: 550,
    miles: 662,
    ratePerMile: 0.83,
    postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-19",

    origin: "Miami, FL",
    originState: "FL",
    originZip: "33101",
    destination: "Atlanta, GA",
    destState: "GA",
    destZip: "30301",
    vehicleType: "Motorcycle",
    transportType: "Open",

    pickup: {
      name: "Residential Pickup",
      address: "789 Ocean Dr, Miami, FL 33101",
      window: "Flexible - call first",
      notes: "Motorcycle runs, lightweight."
    },
    dropoff: {
      name: "Atlanta Moto Shop",
      address: "321 Peachtree St, Atlanta, GA 30301",
      window: "Business hours",
      notes: "Receiving dock available."
    },
    contact: {
      broker: "QuickShip Motors",
      phone: "(404) 555-0234",
      email: "dispatch@quickship.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Easy pickup at residence. Bike runs and is in good condition.",
    stops: 0
  },
  {
    id: "LD-1004",
    ref: "REF-SEA-DEN-004",
    price: 1650,
    miles: 1320,
    ratePerMile: 1.25,
    postedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    pickupDate: "2025-09-25",

    origin: "Seattle, WA",
    originState: "WA",
    originZip: "98101",
    destination: "Denver, CO",
    destState: "CO",
    destZip: "80201",
    vehicleType: "Pickup Truck",
    transportType: "Open",

    pickup: {
      name: "Seattle Auto Auction",
      address: "456 Pike St, Seattle, WA 98101",
      window: "7:00 AM - 3:00 PM",
      notes: "Auction lot - bring gate code."
    },
    dropoff: {
      name: "Denver Dealership",
      address: "890 Broadway, Denver, CO 80201",
      window: "Flexible delivery date",
      notes: "Check in at service desk."
    },
    contact: {
      broker: "Pacific Transport Co",
      phone: "(206) 555-0789",
      email: "logistics@pacifictrans.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Heavy-duty pickup, flexible on delivery date. Two planned stops en route.",
    stops: 2
  },
  {
    id: "LD-1005",
    ref: "REF-PHX-LV-005",
    price: 400,
    miles: 300,
    ratePerMile: 1.33,
    postedAt: new Date(Date.now() - 30 * 60 * 1000),
    pickupDate: "2025-09-18",

    origin: "Phoenix, AZ",
    originState: "AZ",
    originZip: "85001",
    destination: "Las Vegas, NV",
    destState: "NV",
    destZip: "88901",
    vehicleType: "Coupe",
    transportType: "Open",

    pickup: {
      name: "Phoenix Motors",
      address: "111 Central Ave, Phoenix, AZ 85001",
      window: "ASAP - Same day",
      notes: "Quick turnaround needed."
    },
    dropoff: {
      name: "Vegas Auto Gallery",
      address: "777 Las Vegas Blvd, Las Vegas, NV 88901",
      window: "Same day delivery",
      notes: "24/7 receiving available."
    },
    contact: {
      broker: "Express Auto Logistics",
      phone: "(702) 555-0123",
      email: "urgent@expressauto.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Quick same-day delivery required. Short haul, fast turnaround.",
    stops: 0
  },
  {
    id: "LD-1006",
    ref: "REF-BOS-PHL-006",
    price: 520,
    miles: 310,
    ratePerMile: 1.68,
    postedAt: new Date(Date.now() - 15 * 60 * 1000),
    pickupDate: "2025-09-21",
    origin: "Boston, MA",
    originState: "MA",
    originZip: "02108",
    destination: "Philadelphia, PA",
    destState: "PA",
    destZip: "19103",
    vehicleType: "Sedan",
    transportType: "Open",
    pickup: {
      name: "Beacon Garage",
      address: "24 Beacon St, Boston, MA 02108",
      window: "8:00 AM - 12:00 PM",
      notes: "Call on arrival."
    },
    dropoff: {
      name: "Center City Lot",
      address: "1700 Market St, Philadelphia, PA 19103",
      window: "Next day",
      notes: "Underground height limit 7'."
    },
    contact: {
      broker: "Metro Ship",
      phone: "(215) 555-1006",
      email: "ops@metroship.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "",
    stops: 0
  },
  {
    id: "LD-1007",
    ref: "REF-PDX-SLC-007",
    price: 1150,
    miles: 760,
    ratePerMile: 1.51,
    postedAt: new Date(Date.now() - 50 * 60 * 1000),
    pickupDate: "2025-09-20",
    origin: "Portland, OR",
    originState: "OR",
    originZip: "97204",
    destination: "Salt Lake City, UT",
    destState: "UT",
    destZip: "84101",
    vehicleType: "SUV",
    transportType: "Enclosed",
    pickup: {
      name: "Pearl District Lot",
      address: "123 NW 10th Ave, Portland, OR 97204",
      window: "9 AM - 4 PM",
      notes: ""
    },
    dropoff: {
      name: "Downtown SLC",
      address: "50 S Main St, Salt Lake City, UT 84101",
      window: "By 9/22",
      notes: ""
    },
    contact: {
      broker: "Cascade Haul",
      phone: "(503) 555-1007",
      email: "team@cascadehaul.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Night delivery acceptable.",
    stops: 0
  },
  {
    id: "LD-1008",
    ref: "REF-SF-LV-008",
    price: 800,
    miles: 570,
    ratePerMile: 1.40,
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-23",
    origin: "San Francisco, CA",
    originState: "CA",
    originZip: "94103",
    destination: "Las Vegas, NV",
    destState: "NV",
    destZip: "89101",
    vehicleType: "Pickup Truck",
    transportType: "Open",
    pickup: {
      name: "SOMA Lot",
      address: "99 8th St, San Francisco, CA 94103",
      window: "8 AM - 1 PM",
      notes: ""
    },
    dropoff: {
      name: "Fremont St Lot",
      address: "200 Fremont St, Las Vegas, NV 89101",
      window: "Next day",
      notes: ""
    },
    contact: {
      broker: "Golden Gate Freight",
      phone: "(415) 555-1008",
      email: "dispatch@goldengate.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Receiver will sign.",
    stops: 0
  },
  {
    id: "LD-1009",
    ref: "REF-OKC-AUS-009",
    price: 500,
    miles: 390,
    ratePerMile: 1.28,
    postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    pickupDate: "2025-09-19",
    origin: "Oklahoma City, OK",
    originState: "OK",
    originZip: "73102",
    destination: "Austin, TX",
    destState: "TX",
    destZip: "73301",
    vehicleType: "Coupe",
    transportType: "Open",
    pickup: {
      name: "Bricktown Lot",
      address: "100 Sheridan Ave, Oklahoma City, OK 73102",
      window: "10 AM - 2 PM",
      notes: ""
    },
    dropoff: {
      name: "South Congress",
      address: "1500 S Congress Ave, Austin, TX 73301",
      window: "Next day",
      notes: ""
    },
    contact: {
      broker: "Red River Lines",
      phone: "(405) 555-1009",
      email: "ops@redriver.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Customer may reschedule.",
    stops: 0
  },
  {
    id: "LD-1010",
    ref: "REF-SEA-PHX-010",
    price: 1650,
    miles: 1460,
    ratePerMile: 1.13,
    postedAt: new Date(Date.now() - 10 * 60 * 1000),
    pickupDate: "2025-09-21",
    origin: "Seattle, WA",
    originState: "WA",
    originZip: "98101",
    destination: "Phoenix, AZ",
    destState: "AZ",
    destZip: "85001",
    vehicleType: "Motorcycle",
    transportType: "Open",
    pickup: {
      name: "Auction Yard",
      address: "456 2nd Ave, Seattle, WA 98101",
      window: "7 AM - 12 PM",
      notes: ""
    },
    dropoff: {
      name: "Phoenix Depot",
      address: "222 Central Ave, Phoenix, AZ 85001",
      window: "By 9/24",
      notes: ""
    },
    contact: {
      broker: "Evergreen Auto",
      phone: "(206) 555-1010",
      email: "hello@evergreen.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Strapped, no special handling.",
    stops: 0
  },
  {
    id: "LD-1011",
    ref: "REF-ATL-MIA-011",
    price: 980,
    miles: 660,
    ratePerMile: 1.48,
    postedAt: new Date(Date.now() - 12 * 60 * 1000),
    pickupDate: "2025-09-19",
    origin: "Atlanta, GA",
    originState: "GA",
    originZip: "30303",
    destination: "Miami, FL",
    destState: "FL",
    destZip: "33101",
    vehicleType: "SUV",
    transportType: "Open",
    pickup: {
      name: "Midtown Deck",
      address: "860 Peachtree St, Atlanta, GA 30303",
      window: "8 AM - 2 PM",
      notes: ""
    },
    dropoff: {
      name: "Wynwood",
      address: "2600 NW 2nd Ave, Miami, FL 33101",
      window: "Next day",
      notes: ""
    },
    contact: {
      broker: "Peach State Haul",
      phone: "(404) 555-1011",
      email: "ops@peachhaul.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Driver swap in Macon.",
    stops: 0
  },
  {
    id: "LD-1012",
    ref: "REF-LA-SD-012",
    price: 450,
    miles: 120,
    ratePerMile: 3.75,
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-18",
    origin: "Los Angeles, CA",
    originState: "CA",
    originZip: "90012",
    destination: "San Diego, CA",
    destState: "CA",
    destZip: "92101",
    vehicleType: "Coupe",
    transportType: "Enclosed",
    pickup: {
      name: "Downtown Dealer",
      address: "900 Main St, Los Angeles, CA 90012",
      window: "9 AM - 3 PM",
      notes: ""
    },
    dropoff: {
      name: "Kettner Lot",
      address: "600 Kettner Blvd, San Diego, CA 92101",
      window: "Same/next day",
      notes: ""
    },
    contact: {
      broker: "SoCal Enclosed",
      phone: "(213) 555-1012",
      email: "team@socalenclosed.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Delivered to dealership.",
    stops: 0
  },
  {
    id: "LD-1013",
    ref: "REF-DEN-ABQ-013",
    price: 680,
    miles: 450,
    ratePerMile: 1.51,
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    pickupDate: "2025-09-20",
    origin: "Denver, CO",
    originState: "CO",
    originZip: "80202",
    destination: "Albuquerque, NM",
    destState: "NM",
    destZip: "87101",
    vehicleType: "Pickup Truck",
    transportType: "Open",
    pickup: {
      name: "Union Station Garage",
      address: "1701 Wynkoop St, Denver, CO 80202",
      window: "8 AM - 12 PM",
      notes: ""
    },
    dropoff: {
      name: "Old Town",
      address: "200 Central Ave, Albuquerque, NM 87101",
      window: "By 9/21",
      notes: ""
    },
    contact: {
      broker: "Mile High Moves",
      phone: "(720) 555-1013",
      email: "dispatch@milehigh.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "",
    stops: 0
  },
  {
    id: "LD-1014",
    ref: "REF-AUS-DAL-014",
    price: 350,
    miles: 195,
    ratePerMile: 1.79,
    postedAt: new Date(Date.now() - 8 * 60 * 1000),
    pickupDate: "2025-09-19",
    origin: "Austin, TX",
    originState: "TX",
    originZip: "73301",
    destination: "Dallas, TX",
    destState: "TX",
    destZip: "75201",
    vehicleType: "Sedan",
    transportType: "Open",
    pickup: {
      name: "South Austin",
      address: "500 Barton Springs Rd, Austin, TX 73301",
      window: "Morning",
      notes: ""
    },
    dropoff: {
      name: "Uptown",
      address: "2400 Cedar Springs Rd, Dallas, TX 75201",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Lone Star Lines",
      phone: "(512) 555-1014",
      email: "ops@lonestar.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "ETA this evening.",
    stops: 0
  },
  {
    id: "LD-1015",
    ref: "REF-PHL-NYC-015",
    price: 300,
    miles: 95,
    ratePerMile: 3.16,
    postedAt: new Date(Date.now() - 50 * 60 * 1000),
    pickupDate: "2025-09-22",
    origin: "Philadelphia, PA",
    originState: "PA",
    originZip: "19103",
    destination: "New York, NY",
    destState: "NY",
    destZip: "10001",
    vehicleType: "Motorcycle",
    transportType: "Enclosed",
    pickup: {
      name: "Market St",
      address: "1700 Market St, Philadelphia, PA 19103",
      window: "8 AM - 1 PM",
      notes: ""
    },
    dropoff: {
      name: "Chelsea",
      address: "400 W 23rd St, New York, NY 10001",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "I-95 Couriers",
      phone: "(267) 555-1015",
      email: "team@i95couriers.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Owner will be present.",
    stops: 0
  },
  {
    id: "LD-1016",
    ref: "REF-SEA-POR-016",
    price: 420,
    miles: 175,
    ratePerMile: 2.40,
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-19",
    origin: "Seattle, WA",
    originState: "WA",
    originZip: "98101",
    destination: "Portland, OR",
    destState: "OR",
    destZip: "97204",
    vehicleType: "SUV",
    transportType: "Open",
    pickup: {
      name: "Pioneer Square",
      address: "100 Yesler Way, Seattle, WA 98101",
      window: "9 AM - 1 PM",
      notes: ""
    },
    dropoff: {
      name: "Pearl District",
      address: "1200 NW Lovejoy St, Portland, OR 97204",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Cascadia Auto",
      phone: "(206) 555-1016",
      email: "ops@cascadia.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Left at guard desk.",
    stops: 0
  },
  {
    id: "LD-1017",
    ref: "REF-BOI-SLC-017",
    price: 520,
    miles: 340,
    ratePerMile: 1.53,
    postedAt: new Date(Date.now() - 60 * 60 * 1000),
    pickupDate: "2025-09-21",
    origin: "Boise, ID",
    originState: "ID",
    originZip: "83702",
    destination: "Salt Lake City, UT",
    destState: "UT",
    destZip: "84101",
    vehicleType: "Sedan",
    transportType: "Open",
    pickup: {
      name: "Boise Lot",
      address: "200 Capitol Blvd, Boise, ID 83702",
      window: "10 AM - 3 PM",
      notes: ""
    },
    dropoff: {
      name: "Temple Square",
      address: "50 W North Temple, Salt Lake City, UT 84101",
      window: "Next day",
      notes: ""
    },
    contact: {
      broker: "High Desert Lines",
      phone: "(208) 555-1017",
      email: "dispatch@highdesert.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Payment pending.",
    stops: 0
  },
  {
    id: "LD-1018",
    ref: "REF-KC-STL-018",
    price: 400,
    miles: 250,
    ratePerMile: 1.60,
    postedAt: new Date(Date.now() - 22 * 60 * 1000),
    pickupDate: "2025-09-19",
    origin: "Kansas City, MO",
    originState: "MO",
    originZip: "64106",
    destination: "St. Louis, MO",
    destState: "MO",
    destZip: "63101",
    vehicleType: "Coupe",
    transportType: "Open",
    pickup: {
      name: "River Market",
      address: "20 E 5th St, Kansas City, MO 64106",
      window: "Morning",
      notes: ""
    },
    dropoff: {
      name: "Downtown STL",
      address: "1010 Market St, St. Louis, MO 63101",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Show-Me Transport",
      phone: "(816) 555-1018",
      email: "ops@showme.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Bridge detour possible.",
    stops: 0
  },
  {
    id: "LD-1019",
    ref: "REF-ORL-TAM-019",
    price: 260,
    miles: 85,
    ratePerMile: 3.06,
    postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-18",
    origin: "Orlando, FL",
    originState: "FL",
    originZip: "32801",
    destination: "Tampa, FL",
    destState: "FL",
    destZip: "33602",
    vehicleType: "Pickup Truck",
    transportType: "Open",
    pickup: {
      name: "Thornton Park",
      address: "100 Summerlin Ave, Orlando, FL 32801",
      window: "8 AM - 12 PM",
      notes: ""
    },
    dropoff: {
      name: "Channelside",
      address: "615 Channelside Dr, Tampa, FL 33602",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Sunshine Haulers",
      phone: "(407) 555-1019",
      email: "team@sunshinehaul.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Signed by warehouse.",
    stops: 0
  },
  {
    id: "LD-1020",
    ref: "REF-MSP-MAD-020",
    price: 420,
    miles: 270,
    ratePerMile: 1.56,
    postedAt: new Date(Date.now() - 70 * 60 * 1000),
    pickupDate: "2025-09-23",
    origin: "Minneapolis, MN",
    originState: "MN",
    originZip: "55401",
    destination: "Madison, WI",
    destState: "WI",
    destZip: "53703",
    vehicleType: "Sedan",
    transportType: "Open",
    pickup: {
      name: "North Loop",
      address: "200 N 1st Ave, Minneapolis, MN 55401",
      window: "9 AM - 1 PM",
      notes: ""
    },
    dropoff: {
      name: "Capitol",
      address: "2 E Main St, Madison, WI 53703",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Twin Cities Trucking",
      phone: "(612) 555-1020",
      email: "ops@twincities.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Tight alley access.",
    stops: 0
  },
  {
    id: "LD-1021",
    ref: "REF-PHX-ELP-021",
    price: 560,
    miles: 430,
    ratePerMile: 1.30,
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    pickupDate: "2025-09-20",
    origin: "Phoenix, AZ",
    originState: "AZ",
    originZip: "85001",
    destination: "El Paso, TX",
    destState: "TX",
    destZip: "79901",
    vehicleType: "Motorcycle",
    transportType: "Open",
    pickup: {
      name: "Roosevelt Row",
      address: "333 E Roosevelt St, Phoenix, AZ 85001",
      window: "Morning",
      notes: ""
    },
    dropoff: {
      name: "Downtown El Paso",
      address: "500 N Stanton St, El Paso, TX 79901",
      window: "Next day",
      notes: ""
    },
    contact: {
      broker: "Desert Drive",
      phone: "(480) 555-1021",
      email: "hello@desertdrive.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Customer rescheduling.",
    stops: 0
  },
  {
    id: "LD-1022",
    ref: "REF-DET-CLE-022",
    price: 420,
    miles: 170,
    ratePerMile: 2.47,
    postedAt: new Date(Date.now() - 18 * 60 * 1000),
    pickupDate: "2025-09-18",
    origin: "Detroit, MI",
    originState: "MI",
    originZip: "48226",
    destination: "Cleveland, OH",
    destState: "OH",
    destZip: "44114",
    vehicleType: "SUV",
    transportType: "Enclosed",
    pickup: {
      name: "Greektown",
      address: "535 Monroe St, Detroit, MI 48226",
      window: "8 AM - 2 PM",
      notes: ""
    },
    dropoff: {
      name: "Warehouse District",
      address: "1230 W 9th St, Cleveland, OH 44114",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Great Lakes Auto",
      phone: "(313) 555-1022",
      email: "ops@greatlakes.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: true
    },
    notes: "Weather delay possible.",
    stops: 0
  },
  {
    id: "LD-1023",
    ref: "REF-SAT-LA-023",
    price: 1650,
    miles: 1350,
    ratePerMile: 1.22,
    postedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    pickupDate: "2025-09-24",
    origin: "San Antonio, TX",
    originState: "TX",
    originZip: "78205",
    destination: "Los Angeles, CA",
    destState: "CA",
    destZip: "90012",
    vehicleType: "Sedan",
    transportType: "Open",
    pickup: {
      name: "Alamo Plaza",
      address: "300 Alamo Plaza, San Antonio, TX 78205",
      window: "9 AM - 1 PM",
      notes: ""
    },
    dropoff: {
      name: "Civic Center",
      address: "200 N Main St, Los Angeles, CA 90012",
      window: "2-3 days",
      notes: ""
    },
    contact: {
      broker: "I-10 Logistics",
      phone: "(210) 555-1023",
      email: "dispatch@i10logistics.example"
    },
    requirements: {
      insuranceMin: "$1M",
      podRequired: true,
      photosRequired: false
    },
    notes: "Cross-state route.",
    stops: 1
  },
  {
    id: "LD-1024",
    ref: "REF-RDU-CLT-024",
    price: 310,
    miles: 165,
    ratePerMile: 1.88,
    postedAt: new Date(Date.now() - 28 * 60 * 1000),
    pickupDate: "2025-09-24",
    origin: "Raleigh, NC",
    originState: "NC",
    originZip: "27601",
    destination: "Charlotte, NC",
    destState: "NC",
    destZip: "28202",
    vehicleType: "Pickup Truck",
    transportType: "Open",
    pickup: {
      name: "Downtown Raleigh",
      address: "200 Fayetteville St, Raleigh, NC 27601",
      window: "Morning",
      notes: ""
    },
    dropoff: {
      name: "Uptown Charlotte",
      address: "400 S Tryon St, Charlotte, NC 28202",
      window: "Same day",
      notes: ""
    },
    contact: {
      broker: "Carolina Carriers",
      phone: "(919) 555-1024",
      email: "ops@carolinacarriers.example"
    },
    requirements: {
      insuranceMin: "$750K",
      podRequired: true,
      photosRequired: false
    },
    notes: "Call on arrival.",
    stops: 0
  }
];