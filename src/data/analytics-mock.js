const analyticsMock = {
  ranges: ["week", "1m", "3m", "6m", "1y"],

  overview: {
    week: { 
      earnings: 12450, 
      loads: 8, 
      miles: 3200, 
      avgRatePerMile: 3.89,
      trends: {
        earnings: 12.5,
        loads: 8,
        miles: -3,
        avgRatePerMile: 5
      }
    },
    "1m": { 
      earnings: 48500, 
      loads: 32, 
      miles: 12800, 
      avgRatePerMile: 3.79,
      trends: {
        earnings: 8.2,
        loads: 6.5,
        miles: 2.1,
        avgRatePerMile: 3.8
      }
    },
    "3m": { 
      earnings: 142300, 
      loads: 96, 
      miles: 38700, 
      avgRatePerMile: 3.68,
      trends: {
        earnings: 15.4,
        loads: 12.0,
        miles: 7.5,
        avgRatePerMile: 2.1
      }
    },
    "6m": { 
      earnings: 283400, 
      loads: 191, 
      miles: 77400, 
      avgRatePerMile: 3.66,
      trends: {
        earnings: 18.7,
        loads: 14.2,
        miles: 10.3,
        avgRatePerMile: 4.5
      }
    },
    "1y": { 
      earnings: 566800, 
      loads: 382, 
      miles: 154800, 
      avgRatePerMile: 3.41,
      trends: {
        earnings: 22.3,
        loads: 16.8,
        miles: 12.4,
        avgRatePerMile: 6.2
      }
    }
  },

  series: {
    week: {
      dailyEarnings: [
        { day: "Mon", amount: 2100 },
        { day: "Tue", amount: 1850 },
        { day: "Wed", amount: 2300 },
        { day: "Thu", amount: 1900 },
        { day: "Fri", amount: 2450 },
        { day: "Sat", amount: 1850 },
        { day: "Sun", amount: 0 }
      ]
    },
    "1m": {
      weeklyEarnings: [
        { week: "Week 1", amount: 9225 },
        { week: "Week 2", amount: 11340 },
        { week: "Week 3", amount: 12885 },
        { week: "Week 4", amount: 15050 }
      ],
      dailyEarnings: [
        { day: "Dec 1", amount: 1450 },
        { day: "Dec 2", amount: 1620 },
        { day: "Dec 3", amount: 1380 },
        { day: "Dec 4", amount: 1490 },
        { day: "Dec 5", amount: 1720 },
        { day: "Dec 6", amount: 1950 },
        { day: "Dec 7", amount: 1820 },
        { day: "Dec 8", amount: 1750 },
        { day: "Dec 9", amount: 1690 },
        { day: "Dec 10", amount: 1850 },
        { day: "Dec 11", amount: 1920 },
        { day: "Dec 12", amount: 2100 },
        { day: "Dec 13", amount: 2050 },
        { day: "Dec 14", amount: 1980 },
        { day: "Dec 15", amount: 1900 },
        { day: "Dec 16", amount: 2120 },
        { day: "Dec 17", amount: 2260 },
        { day: "Dec 18", amount: 2400 },
        { day: "Dec 19", amount: 2180 },
        { day: "Dec 20", amount: 2310 },
        { day: "Dec 21", amount: 2500 },
        { day: "Dec 22", amount: 2660 },
        { day: "Dec 23", amount: 2550 },
        { day: "Dec 24", amount: 1200 },
        { day: "Dec 25", amount: 0 },
        { day: "Dec 26", amount: 2610 },
        { day: "Dec 27", amount: 2750 },
        { day: "Dec 28", amount: 2880 },
        { day: "Dec 29", amount: 2950 },
        { day: "Dec 30", amount: 3100 }
      ]
    },
    "3m": {
      monthlyEarnings: [
        { month: "Oct", amount: 46200 },
        { month: "Nov", amount: 47800 },
        { month: "Dec", amount: 48300 }
      ]
    },
    "6m": {
      monthlyEarnings: [
        { month: "Jul", amount: 44400 },
        { month: "Aug", amount: 45900 },
        { month: "Sep", amount: 46300 },
        { month: "Oct", amount: 46200 },
        { month: "Nov", amount: 47800 },
        { month: "Dec", amount: 52800 }
      ]
    },
    "1y": {
      monthlyEarnings: [
        { month: "Jan", amount: 42000 },
        { month: "Feb", amount: 43800 },
        { month: "Mar", amount: 45200 },
        { month: "Apr", amount: 46100 },
        { month: "May", amount: 47200 },
        { month: "Jun", amount: 49500 },
        { month: "Jul", amount: 44400 },
        { month: "Aug", amount: 45900 },
        { month: "Sep", amount: 46300 },
        { month: "Oct", amount: 46200 },
        { month: "Nov", amount: 47800 },
        { month: "Dec", amount: 52400 }
      ]
    }
  },

  topLanes: {
    week: [
      { lane: "Chicago, IL - Atlanta, GA", count: 3, revenue: 4500, trend: 12 },
      { lane: "Detroit, MI - Nashville, TN", count: 2, revenue: 3200, trend: 8 },
      { lane: "Columbus, OH - Memphis, TN", count: 2, revenue: 2800, trend: -2 }
    ],
    "1m": [
      { lane: "Dallas, TX - Phoenix, AZ", count: 7, revenue: 10950, trend: 15 },
      { lane: "Atlanta, GA - Miami, FL", count: 6, revenue: 9400, trend: 10 },
      { lane: "Chicago, IL - Denver, CO", count: 5, revenue: 8800, trend: 5 }
    ],
    "3m": [
      { lane: "Los Angeles, CA - Phoenix, AZ", count: 22, revenue: 34500, trend: 8 },
      { lane: "Chicago, IL - Atlanta, GA", count: 18, revenue: 28900, trend: 12 },
      { lane: "Dallas, TX - Houston, TX", count: 16, revenue: 24200, trend: -3 }
    ],
    "6m": [
      { lane: "Los Angeles, CA - Phoenix, AZ", count: 45, revenue: 71200, trend: 10 },
      { lane: "New York, NY - Boston, MA", count: 38, revenue: 59800, trend: 7 },
      { lane: "Chicago, IL - Denver, CO", count: 32, revenue: 51300, trend: 5 }
    ],
    "1y": [
      { lane: "Los Angeles, CA - Phoenix, AZ", count: 92, revenue: 145600, trend: 6 },
      { lane: "Chicago, IL - Atlanta, GA", count: 78, revenue: 123400, trend: 9 },
      { lane: "Dallas, TX - Houston, TX", count: 71, revenue: 108900, trend: 4 }
    ]
  },

  allLanesByRange: {
    week: [
      { lane: "Chicago, IL - Atlanta, GA", region: "National", loads: 3, revenue: 4500, changePct: 12 },
      { lane: "Detroit, MI - Nashville, TN", region: "National", loads: 2, revenue: 3200, changePct: 8 },
      { lane: "Columbus, OH - Memphis, TN", region: "National", loads: 2, revenue: 2800, changePct: 5 },
      { lane: "Dallas, TX - Houston, TX", region: "South", loads: 4, revenue: 4100, changePct: 15 },
      { lane: "Miami, FL - Orlando, FL", region: "South", loads: 3, revenue: 3600, changePct: 6 },
      { lane: "Los Angeles, CA - Phoenix, AZ", region: "West", loads: 5, revenue: 5200, changePct: 14 },
      { lane: "Seattle, WA - Portland, OR", region: "West", loads: 2, revenue: 2600, changePct: 5 },
      { lane: "New York, NY - Boston, MA", region: "Northeast", loads: 3, revenue: 4700, changePct: 9 },
      { lane: "Philadelphia, PA - Washington, DC", region: "Northeast", loads: 2, revenue: 2900, changePct: 3 },
      { lane: "Cincinnati, OH - Chicago, IL", region: "Midwest", loads: 2, revenue: 2500, changePct: -2 },
      { lane: "Kansas City, MO - St. Louis, MO", region: "Midwest", loads: 1, revenue: 1800, changePct: -5 },
      { lane: "San Francisco, CA - Sacramento, CA", region: "West", loads: 2, revenue: 2100, changePct: 7 }
    ],
    "1m": [
      { lane: "Dallas, TX - Phoenix, AZ", region: "South", loads: 7, revenue: 10950, changePct: 18 },
      { lane: "Atlanta, GA - Miami, FL", region: "South", loads: 6, revenue: 9400, changePct: 12 },
      { lane: "Chicago, IL - Denver, CO", region: "National", loads: 5, revenue: 8800, changePct: 10 },
      { lane: "Memphis, TN - Houston, TX", region: "South", loads: 4, revenue: 7200, changePct: 8 },
      { lane: "Los Angeles, CA - Phoenix, AZ", region: "West", loads: 18, revenue: 22600, changePct: 15 },
      { lane: "Seattle, WA - Portland, OR", region: "West", loads: 7, revenue: 9400, changePct: 5 },
      { lane: "New York, NY - Boston, MA", region: "Northeast", loads: 12, revenue: 18500, changePct: 11 },
      { lane: "Philadelphia, PA - Washington, DC", region: "Northeast", loads: 8, revenue: 11200, changePct: 7 },
      { lane: "Cincinnati, OH - Chicago, IL", region: "Midwest", loads: 9, revenue: 11800, changePct: 3 },
      { lane: "Detroit, MI - Cleveland, OH", region: "Midwest", loads: 6, revenue: 8900, changePct: -1 },
      { lane: "San Diego, CA - Las Vegas, NV", region: "West", loads: 8, revenue: 10300, changePct: 9 },
      { lane: "Tampa, FL - Jacksonville, FL", region: "South", loads: 5, revenue: 6800, changePct: 4 },
      { lane: "Indianapolis, IN - Columbus, OH", region: "Midwest", loads: 4, revenue: 5600, changePct: 2 },
      { lane: "Salt Lake City, UT - Denver, CO", region: "West", loads: 6, revenue: 9100, changePct: 6 },
      { lane: "Baltimore, MD - Richmond, VA", region: "Northeast", loads: 3, revenue: 4200, changePct: 1 }
    ],
    "3m": [
      { lane: "Los Angeles, CA - Phoenix, AZ", region: "West", loads: 22, revenue: 34500, changePct: 9 },
      { lane: "Chicago, IL - Atlanta, GA", region: "National", loads: 18, revenue: 28900, changePct: 7 },
      { lane: "Dallas, TX - Houston, TX", region: "South", loads: 16, revenue: 24200, changePct: 6 },
      { lane: "New York, NY - Boston, MA", region: "Northeast", loads: 14, revenue: 22000, changePct: 5 },
      { lane: "Seattle, WA - Portland, OR", region: "West", loads: 11, revenue: 14500, changePct: 4 },
      { lane: "Miami, FL - Tampa, FL", region: "South", loads: 9, revenue: 11800, changePct: 3 },
      { lane: "Denver, CO - Salt Lake City, UT", region: "West", loads: 8, revenue: 12400, changePct: 8 },
      { lane: "Detroit, MI - Chicago, IL", region: "Midwest", loads: 10, revenue: 15200, changePct: 2 },
      { lane: "Phoenix, AZ - Las Vegas, NV", region: "West", loads: 7, revenue: 10500, changePct: -1 },
      { lane: "Nashville, TN - Memphis, TN", region: "South", loads: 6, revenue: 8900, changePct: 0 }
    ],
    "6m": [
      { lane: "Los Angeles, CA - Phoenix, AZ", region: "West", loads: 45, revenue: 71200, changePct: 8 },
      { lane: "New York, NY - Boston, MA", region: "Northeast", loads: 38, revenue: 59800, changePct: 6 },
      { lane: "Chicago, IL - Denver, CO", region: "National", loads: 32, revenue: 51300, changePct: 5 },
      { lane: "Dallas, TX - Houston, TX", region: "South", loads: 28, revenue: 43600, changePct: 4 },
      { lane: "Atlanta, GA - Miami, FL", region: "South", loads: 25, revenue: 38900, changePct: 7 },
      { lane: "Seattle, WA - San Francisco, CA", region: "West", loads: 20, revenue: 32400, changePct: 3 },
      { lane: "Detroit, MI - Cleveland, OH", region: "Midwest", loads: 18, revenue: 27800, changePct: 2 },
      { lane: "Phoenix, AZ - Las Vegas, NV", region: "West", loads: 16, revenue: 24500, changePct: 9 },
      { lane: "Orlando, FL - Tampa, FL", region: "South", loads: 14, revenue: 19800, changePct: -2 },
      { lane: "Kansas City, MO - Oklahoma City, OK", region: "Midwest", loads: 12, revenue: 17600, changePct: 1 },
      { lane: "Portland, OR - Sacramento, CA", region: "West", loads: 10, revenue: 15200, changePct: 5 },
      { lane: "Baltimore, MD - Philadelphia, PA", region: "Northeast", loads: 8, revenue: 12400, changePct: 0 }
    ],
    "1y": [
      { lane: "Los Angeles, CA - Phoenix, AZ", region: "West", loads: 92, revenue: 145600, changePct: 6 },
      { lane: "Chicago, IL - Atlanta, GA", region: "National", loads: 78, revenue: 123400, changePct: 5 },
      { lane: "Dallas, TX - Houston, TX", region: "South", loads: 71, revenue: 108900, changePct: 4 },
      { lane: "New York, NY - Boston, MA", region: "Northeast", loads: 65, revenue: 98700, changePct: 3 },
      { lane: "Miami, FL - Orlando, FL", region: "South", loads: 52, revenue: 78300, changePct: 7 },
      { lane: "Seattle, WA - Portland, OR", region: "West", loads: 48, revenue: 71200, changePct: 8 },
      { lane: "Denver, CO - Salt Lake City, UT", region: "West", loads: 45, revenue: 66800, changePct: 2 },
      { lane: "Phoenix, AZ - Las Vegas, NV", region: "West", loads: 42, revenue: 61500, changePct: 9 },
      { lane: "Atlanta, GA - Nashville, TN", region: "South", loads: 38, revenue: 54300, changePct: 1 },
      { lane: "Detroit, MI - Chicago, IL", region: "Midwest", loads: 35, revenue: 49800, changePct: -1 },
      { lane: "San Francisco, CA - Sacramento, CA", region: "West", loads: 32, revenue: 44600, changePct: 5 },
      { lane: "Kansas City, MO - St. Louis, MO", region: "Midwest", loads: 28, revenue: 38900, changePct: 0 },
      { lane: "Tampa, FL - Jacksonville, FL", region: "South", loads: 25, revenue: 34200, changePct: 6 },
      { lane: "Philadelphia, PA - Washington, DC", region: "Northeast", loads: 22, revenue: 29700, changePct: 4 },
      { lane: "Columbus, OH - Cincinnati, OH", region: "Midwest", loads: 18, revenue: 24500, changePct: -2 }
    ]
  }
};

export default analyticsMock;