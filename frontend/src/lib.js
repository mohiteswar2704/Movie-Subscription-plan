export const apibaseurl = 'http://localhost:8000';
export const imgurl = import.meta.env.BASE_URL;

export const planCatalog = [
    {
        id: "starter",
        name: "Starter",
        audience: "Solo users",
        monthly: 9,
        yearly: 90,
        devices: 1,
        quality: "HD stream",
        support: "Email",
        badge: "Best entry plan",
        tone: "gold",
        features: ["1 screen", "Offline access", "Smart recommendations"],
        summary: "A lean plan for users who only need one active device and fast browsing.",
    },
    {
        id: "plus",
        name: "Plus",
        audience: "Shared households",
        monthly: 14,
        yearly: 140,
        devices: 3,
        quality: "Full HD",
        support: "Priority chat",
        badge: "Most balanced",
        tone: "teal",
        features: ["3 screens", "Profile sharing", "Billing reminders"],
        summary: "A practical plan that fits families or teams who want a little more room.",
    },
    {
        id: "pro",
        name: "Pro",
        audience: "Heavy streamers",
        monthly: 19,
        yearly: 190,
        devices: 5,
        quality: "4K stream",
        support: "Priority support",
        badge: "Recommended",
        tone: "violet",
        features: ["5 screens", "Priority queue", "Advanced plan insights"],
        summary: "The best fit for users who track status, switch plans often, and need headroom.",
    },
    {
        id: "elite",
        name: "Elite",
        audience: "Power teams",
        monthly: 29,
        yearly: 290,
        devices: 8,
        quality: "4K + extras",
        support: "Dedicated support",
        badge: "Maximum coverage",
        tone: "coral",
        features: ["8 screens", "Dedicated account view", "Usage analytics"],
        summary: "Built for users who need the fullest plan and visibility into usage trends.",
    },
];

export const subscriptionSeed = {
    user: {
        fullname: "Aarav Mehta",
        phone: "+91 98765 43210",
        email: "aarav@streamflow.com",
        role: "Subscriber",
    },
    activePlanId: "pro",
    billingCycle: "monthly",
    status: "Active",
    renewalDate: "2026-06-19",
    searchFocus: "4K, family sharing, priority support",
};

export function getPlanById(planId) {
    return planCatalog.find((plan) => plan.id === planId) ?? planCatalog[0];
}

export function formatPlanPrice(plan, billingCycle = "monthly") {
    const amount = billingCycle === "yearly" ? plan.yearly : plan.monthly;
    return `$${amount}`;
}

export function formatPlanCycleLabel(billingCycle) {
    return billingCycle === "yearly" ? "year" : "month";
}

export function searchPlans(plans, query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return plans;

    const tokens = normalized.split(/\s+/).filter(Boolean);
    return plans.filter((plan) => {
        const haystack = [
            plan.name,
            plan.audience,
            plan.quality,
            plan.support,
            plan.badge,
            plan.summary,
            ...plan.features,
            String(plan.devices),
            String(plan.monthly),
            String(plan.yearly),
        ]
            .join(" ")
            .toLowerCase();

        return tokens.every((token) => haystack.includes(token));
    });
}

export function addDays(dateValue, days) {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export function computeSavings(plan) {
    const monthlyCost = plan.monthly * 12;
    return monthlyCost - plan.yearly;
}

// Persistence helpers for planCatalog so admin UI can modify plans locally
const PLANS_STORAGE_KEY = 'subscription-plans-v1';

export function getStoredPlans() {
    try {
        const raw = localStorage.getItem(PLANS_STORAGE_KEY);
        if (!raw) return planCatalog.slice();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
        return planCatalog.slice();
    } catch {
        return planCatalog.slice();
    }
}

export function savePlans(plans) {
    try {
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
        return true;
    } catch {
        return false;
    }
}

export const defaultUsers = [
    {
        id: "user-1",
        fullname: "Aarav Mehta",
        phone: "+91 98765 43210",
        email: "aarav@streamflow.com",
        role: "Subscriber",
        activePlanId: "pro",
        billingCycle: "monthly",
        renewalDate: "2026-07-14",
    },
    {
        id: "user-2",
        fullname: "Priya Sharma",
        phone: "+91 91234 56789",
        email: "priya@streamflow.com",
        role: "Subscriber",
        activePlanId: "elite",
        billingCycle: "yearly",
        renewalDate: "2027-06-14",
    },
    {
        id: "user-3",
        fullname: "Vikram Singh",
        phone: "+91 98123 45670",
        email: "vikram@streamflow.com",
        role: "Subscriber",
        activePlanId: "starter",
        billingCycle: "monthly",
        renewalDate: "2026-07-05",
    },
    {
        id: "user-4",
        fullname: "Neha Patel",
        phone: "+91 95555 12345",
        email: "neha@streamflow.com",
        role: "Admin",
        activePlanId: "pro",
        billingCycle: "yearly",
        renewalDate: "2027-02-18",
    }
];

const USERS_STORAGE_KEY = 'subscription-users-v1';

export function getStoredUsers() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
            return defaultUsers.slice();
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
        return defaultUsers.slice();
    } catch {
        return defaultUsers.slice();
    }
}

export function saveUsers(users) {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        return true;
    } catch {
        return false;
    }
}