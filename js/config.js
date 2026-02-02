// === GLOBAL VARIABLES & CONFIG ===
// NOTE: Replace these with your actual Firebase config if not using environment variables
const firebaseConfig = {
  apiKey: "AIzaSyBZVvsZcsdrCDYb5JqiZFLaN52hjUi_Arw",
  authDomain: "assignment-interruption-e9481.firebaseapp.com",
  projectId: "assignment-interruption-e9481",
  storageBucket: "assignment-interruption-e9481.firebasestorage.app",
  messagingSenderId: "246855027730",
  appId: "1:246855027730:web:a61bd1dcb9e103c3cc9ccb"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const GAS_URL = "https://script.google.com/macros/s/AKfycbw4q5HFIqlTvrA34NN_P9hEWXdVDpyoFICq1OK1NvMkjjN52TSJk5mLHhugc2wbLcqkxA/exec";

const CONST_DATA = { 
    projects: [ "MEA", "PEA", "NBTC", "Sky Train", "Bangkok Metropolis", "BTS", "MRT", "NT", "Customer", "Department Of Highways", "Department Of Rural Road", "Landlord", "Local Authorty", "Motorway", "State Railway OF Thailand", "Underground", "MOI", "Noah", "DWDM", "OLT and ONU", "Site Relocation", "Fiber Infra Sharing", "Improvement", "Migration","Other" ], 
    agencies: [ "MEA", "PEA", "NBTC", "Sky Train", "NPD", "SQM", "Region", "NOC", "SQI", "ROW", "Landlord", "TPD", "Customer", "Bangkok Metropolis", "BTS", "MRT", "NT", "Motorway", "Department Of Highways", "Department Of Rural Road", "Other" ],
    teamRequests: [ "NOC", "HelpDesk", "TPD", "NPD", "SQM", "SQI", "Sale", "Region BKK", "Cores Network", "Landlord", "SDM", "Region Provincial", "ROW", "Other" ], 
    sideCounts: ["1 ฝั่ง", "2 ฝั่ง"],
    jobTypes: { 
        team: ["Improvement", "Create Route", "Meeting", "Team Daily", "Support", "Other"], 
        plan: ["Interruption OFC", "Interruption Equipment", "Information", "Other"], 
        summary_plan: ["MEA", "PEA","MOI","Sky Trai","Bangkok Metropolis","Department Of Highways","Landlord","Underground","Fiber Infra Sharing", "Other"],
        preventive: ["Preventive มัดรวบสาย", "Preventive ย้ายแนวสาย", "Preventive เข้าคอนใหม่", "Preventive ติดสติ๊กเกอร์", "Preventive รื้อถอนสายตาย", "Preventive Stand by", "Preventive ทำความสะอาดSite", "Special Job", "Other"], 
        reroute: ["Reroute Project", "Underground", "MOI", "Reconfig for Reroute", "Special Job", "Other"], 
        reconfigure: ["Reconfig high loss", "Reconfig New Route","Cancle OFC","Special Job", "Other"] 
    } 
};

const menuConfig = { 
    'plan_interruption': { title: 'Interruption Plan', isSub: false, isPlan: true, prefix: 'IP', jobTypeKey: 'plan', sheetName: 'Interruption Plan' }, 
    'summary_plan': { title: 'Project Plan', isSub: false, isPlan: true, prefix: 'Sum', jobTypeKey: 'summary_plan', sheetName: 'Summary Plan' }, 
    'team': { title: 'Assignment Interruption Team', isSub: false, prefix: 'AI', jobTypeKey: 'team', sheetName: 'Interruption Team' }, 
    'sub_preventive': { title: 'Assignment Preventive', isSub: true, prefix: 'PVT', jobTypeKey: 'preventive', sheetName: 'Assignment Preventive' }, 
    'sub_reroute': { title: 'Assignment Reroute', isSub: true, prefix: 'RER', jobTypeKey: 'reroute', sheetName: 'Assignment Reroute' }, 
    'sub_reconfigure': { title: 'Assignment Reconfigure & Cancel', isSub: true, prefix: 'REF', jobTypeKey: 'reconfigure', sheetName: 'Assignment Reconfigure' }, 
    'dashboard_analytics': { title: 'Dashboard Analytics', isSub: false, isPlan: false, prefix: 'DB', jobTypeKey: 'team' }, 
    'sub_dashboard': { title: 'Dashboard Subcontractor', isSub: false, isPlan: false, prefix: 'DBS', jobTypeKey: 'preventive' } 
};

// === STATE MANAGEMENT ===
const AppState = {
    assignments: [],
    masterData: {},
    currentView: 'calendar',
    currentCategoryFilter: 'all',
    currentPage: 1,
    rowsPerPage: 10,
    filteredData: [],
    charts: {},
    calendar: {
        date: new Date(),
        viewMode: 'month'
    },
    listeners: {
        assignments: null
    }
};

let auth, db;
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase Init Error:", e);
}
