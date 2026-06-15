import React, { useEffect, useState, useMemo } from 'react';
import './Admin.css';
import { getStoredPlans, savePlans, getStoredUsers, saveUsers, imgurl, getPlanById } from '../lib';

const emptyPlan = () => ({
    id: `plan-${Date.now()}`,
    name: '',
    audience: '',
    monthly: 0,
    yearly: 0,
    devices: 1,
    quality: '',
    support: '',
    badge: '',
    tone: 'teal',
    features: [],
    summary: '',
});

export default function Admin() {
    const [plans, setPlans] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Plan Management States
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [planForm, setPlanForm] = useState(emptyPlan());
    
    // User Management States
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Logged-in Admin Info State
    const [adminInfo, setAdminInfo] = useState({ fullname: 'Admin User', email: 'admin@streamflow.com' });

    useEffect(() => {
        // Authenticate & Role check
        if (!localStorage.getItem('token')) {
            window.location.replace('/');
            return;
        }

        try {
            const stored = JSON.parse(localStorage.getItem('subscription-dashboard-state') || '{}');
            if (stored.user?.role !== 'Admin') {
                window.location.replace('/home');
                return;
            }
            if (stored.user) {
                setAdminInfo(stored.user);
            }
        } catch (e) {
            console.error('Session error', e);
        }

        setPlans(getStoredPlans());
        setUsers(getStoredUsers());
    }, []);

    // Save plans to local storage and state
    function updatePlansList(updatedPlans) {
        setPlans(updatedPlans);
        savePlans(updatedPlans);
    }

    // Save users to local storage and state
    function updateUsersList(updatedUsers) {
        setUsers(updatedUsers);
        saveUsers(updatedUsers);

        // If the updated list includes our currently logged-in user, sync their session state
        try {
            const stored = JSON.parse(localStorage.getItem('subscription-dashboard-state') || '{}');
            const matchingUser = updatedUsers.find(u => u.email.toLowerCase() === stored.user?.email?.toLowerCase());
            if (matchingUser) {
                const updatedSession = {
                    ...stored,
                    user: {
                        ...stored.user,
                        fullname: matchingUser.fullname,
                        role: matchingUser.role
                    },
                    activePlanId: matchingUser.activePlanId,
                    billingCycle: matchingUser.billingCycle,
                    renewalDate: matchingUser.renewalDate
                };
                localStorage.setItem('subscription-dashboard-state', JSON.stringify(updatedSession));
            }
        } catch (e) {
            console.error('Sync session error', e);
        }
    }

    // Logout function
    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('subscription-dashboard-state');
        window.location.replace('/');
    }

    // Plan Management Handlers
    function handleEditPlan(plan) {
        setEditingPlanId(plan.id);
        setPlanForm({ ...plan, features: (plan.features || []).join(', ') });
    }

    function handleCreateNewPlan() {
        const newP = emptyPlan();
        const updated = [newP, ...plans];
        updatePlansList(updated);
        setEditingPlanId(newP.id);
        setPlanForm({ ...newP, features: '' });
    }

    function handleDeletePlan(planId) {
        if (window.confirm('Are you sure you want to delete this plan?')) {
            const updated = plans.filter((p) => p.id !== planId);
            updatePlansList(updated);
            if (editingPlanId === planId) {
                setEditingPlanId(null);
            }
        }
    }

    function handlePlanFormChange(e) {
        const { name, value } = e.target;
        setPlanForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleSavePlanEdit() {
        const normalized = {
            ...planForm,
            monthly: Number(planForm.monthly) || 0,
            yearly: Number(planForm.yearly) || 0,
            devices: Number(planForm.devices) || 1,
            features: (planForm.features || '').split(',').map((s) => s.trim()).filter(Boolean),
        };
        const updated = plans.map((p) => (p.id === editingPlanId ? { ...p, ...normalized } : p));
        updatePlansList(updated);
        setEditingPlanId(null);
    }

    // User Management Handlers
    function handleUserPlanChange(userId, newPlanId) {
        const updated = users.map(user => {
            if (user.id === userId) {
                return { ...user, activePlanId: newPlanId };
            }
            return user;
        });
        updateUsersList(updated);
    }

    function handleUserBillingCycleToggle(userId) {
        const updated = users.map(user => {
            if (user.id === userId) {
                const nextCycle = user.billingCycle === 'monthly' ? 'yearly' : 'monthly';
                return { ...user, billingCycle: nextCycle };
            }
            return user;
        });
        updateUsersList(updated);
    }

    function handleUserRoleToggle(userId) {
        const updated = users.map(user => {
            if (user.id === userId) {
                const nextRole = user.role === 'Admin' ? 'Subscriber' : 'Admin';
                return { ...user, role: nextRole };
            }
            return user;
        });
        updateUsersList(updated);
    }

    function handleUserDelete(userId) {
        if (window.confirm('Are you sure you want to delete this user?')) {
            const updated = users.filter(u => u.id !== userId);
            updateUsersList(updated);
        }
    }

    // Statistics Computations
    const stats = useMemo(() => {
        let monthlyRevenue = 0;
        let yearlyRevenue = 0;
        const planCounts = {};

        users.forEach(user => {
            const plan = plans.find(p => p.id === user.activePlanId) || getPlanById(user.activePlanId);
            if (plan) {
                planCounts[plan.name] = (planCounts[plan.name] || 0) + 1;
                if (user.billingCycle === 'yearly') {
                    yearlyRevenue += plan.yearly;
                } else {
                    monthlyRevenue += plan.monthly;
                }
            }
        });

        const totalEstimatedMRR = monthlyRevenue + (yearlyRevenue / 12);
        
        let popularPlan = 'N/A';
        let maxCount = -1;
        Object.entries(planCounts).forEach(([planName, count]) => {
            if (count > maxCount) {
                maxCount = count;
                popularPlan = planName;
            }
        });

        return {
            mrr: totalEstimatedMRR.toFixed(2),
            arr: (totalEstimatedMRR * 12).toFixed(2),
            popularPlan,
            totalUsersCount: users.length,
            totalPlansCount: plans.length
        };
    }, [plans, users]);

    // Filtering users for User tab
    const filteredUsers = useMemo(() => {
        const normalizedQuery = userSearchQuery.trim().toLowerCase();
        if (!normalizedQuery) return users;
        return users.filter(user => 
            user.fullname.toLowerCase().includes(normalizedQuery) ||
            user.email.toLowerCase().includes(normalizedQuery) ||
            user.role.toLowerCase().includes(normalizedQuery) ||
            user.activePlanId.toLowerCase().includes(normalizedQuery)
        );
    }, [users, userSearchQuery]);

    return (
        <div className='admin-dashboard'>
            {/* Header */}
            <header className='admin-header-bar'>
                <div className='brand-row'>
                    <div className='brand-mark'>
                        <img src={imgurl + 'movie-time-brand.svg'} alt='Movie Time logo' />
                    </div>
                </div>
                <div className='admin-title'>
                    <h1>Admin Dashboard — Command Center</h1>
                </div>
                <div className='info'>
                    <span>{adminInfo.fullname} (Admin)</span>
                    <button className='icon-button logout-btn' onClick={handleLogout} title="Log out">
                        <img src={imgurl + 'shutdown.png'} alt='Log out' />
                    </button>
                </div>
            </header>

            {/* Layout Workspace */}
            <div className='admin-workspace'>
                {/* Sidebar Menu */}
                <aside className='admin-sidebar'>
                    <ul>
                        <li 
                            className={activeTab === 'overview' ? 'active' : ''} 
                            onClick={() => setActiveTab('overview')}
                        >
                            <img src={imgurl + 'dashboard.png'} alt='' />
                            Overview
                        </li>
                        <li 
                            className={activeTab === 'plans' ? 'active' : ''} 
                            onClick={() => setActiveTab('plans')}
                        >
                            <img src={imgurl + 'taskmanager.png'} alt='' />
                            Manage Plans
                        </li>
                        <li 
                            className={activeTab === 'users' ? 'active' : ''} 
                            onClick={() => setActiveTab('users')}
                        >
                            <img src={imgurl + 'myprofile.png'} alt='' />
                            User & Billing
                        </li>
                    </ul>
                </aside>

                {/* Dashboard Content Container */}
                <main className='admin-content-pane'>
                    
                    {/* OVERVIEW MODULE */}
                    {activeTab === 'overview' && (
                        <div className='overview-module'>
                            <div className='admin-welcome-hero'>
                                <div>
                                    <span className='eyebrow'>System Status: Active</span>
                                    <h2>Welcome Back, {adminInfo.fullname}!</h2>
                                    <p>
                                        Manage film subscription tier pricing, toggle active plans, update billing arrangements, and oversee registered subscribers from one unified panel.
                                    </p>
                                </div>
                                <div className='quick-actions-box'>
                                    <button onClick={() => setActiveTab('plans')}>Manage pricing plans</button>
                                    <button onClick={() => setActiveTab('users')}>Browse registered users</button>
                                </div>
                            </div>

                            <div className='admin-stats-grid'>
                                <article className='stat-card'>
                                    <span>Registered Users</span>
                                    <strong>{stats.totalUsersCount}</strong>
                                    <p>Subscribers & Admins in catalog</p>
                                </article>
                                <article className='stat-card'>
                                    <span>Plan Packages</span>
                                    <strong>{stats.totalPlansCount}</strong>
                                    <p>Active plan tiers offered</p>
                                </article>
                                <article className='stat-card'>
                                    <span>Est. Monthly MRR</span>
                                    <strong>${stats.mrr}</strong>
                                    <p>Est. Annual ARR: ${stats.arr}</p>
                                </article>
                                <article className='stat-card'>
                                    <span>Most Popular tier</span>
                                    <strong>{stats.popularPlan}</strong>
                                    <p>Top subscribed plan catalog choice</p>
                                </article>
                            </div>

                            <div className='system-meta-panel'>
                                <h3>Quick System Overview</h3>
                                <div className='meta-details-list'>
                                    <div className='meta-item'>
                                        <span>Environment</span>
                                        <strong>Production / Live</strong>
                                    </div>
                                    <div className='meta-item'>
                                        <span>Database Sync Status</span>
                                        <strong>Synchronized (Local Storage Client Mode)</strong>
                                    </div>
                                    <div className='meta-item'>
                                        <span>Logged user details</span>
                                        <strong>{adminInfo.email} ({adminInfo.role})</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MANAGE PLANS MODULE */}
                    {activeTab === 'plans' && (
                        <div className='plans-module'>
                            <div className='module-header'>
                                <div>
                                    <h2>Plan Packages & Tiers</h2>
                                    <p>Create new plans or edit details (devices, streaming quality, billing price, name, etc.)</p>
                                </div>
                                <button className='btn-primary' onClick={handleCreateNewPlan}>New Plan</button>
                            </div>

                            <div className='plans-split-grid'>
                                <div className='plans-list-container'>
                                    {plans.map((plan) => (
                                        <div className={`admin-plan-card ${editingPlanId === plan.id ? 'editing-active' : ''}`} key={plan.id}>
                                            <div className='plan-card-header'>
                                                <div className='title-area'>
                                                    {plan.badge && <span className='badge-pill'>{plan.badge}</span>}
                                                    <h3>{plan.name || '(untitled)'}</h3>
                                                </div>
                                                <div className='card-buttons'>
                                                    <button className='btn-secondary btn-sm' onClick={() => handleEditPlan(plan)}>Edit</button>
                                                    <button className='btn-danger btn-sm' onClick={() => handleDeletePlan(plan.id)}>Delete</button>
                                                </div>
                                            </div>
                                            <p className='plan-summary'>{plan.summary || 'No summary description provided.'}</p>
                                            <div className='plan-meta-bar'>
                                                <span><strong>Price:</strong> ${plan.monthly}/mo or ${plan.yearly}/yr</span>
                                                <span><strong>Devices:</strong> {plan.devices}</span>
                                                <span><strong>Audience:</strong> {plan.audience || 'General'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className='plan-editor-sidebar'>
                                    {editingPlanId ? (
                                        <div className='editor-form-card'>
                                            <h3>Modify Subscription Plan</h3>
                                            <div className='form-group'>
                                                <label>Plan Name</label>
                                                <input name='name' value={planForm.name} onChange={handlePlanFormChange} placeholder='e.g., Premium Pro' />
                                            </div>
                                            <div className='form-group-row'>
                                                <div className='form-group'>
                                                    <label>Monthly Price ($)</label>
                                                    <input name='monthly' value={planForm.monthly} onChange={handlePlanFormChange} type='number' />
                                                </div>
                                                <div className='form-group'>
                                                    <label>Yearly Price ($)</label>
                                                    <input name='yearly' value={planForm.yearly} onChange={handlePlanFormChange} type='number' />
                                                </div>
                                            </div>
                                            <div className='form-group-row'>
                                                <div className='form-group'>
                                                    <label>Devices Support</label>
                                                    <input name='devices' value={planForm.devices} onChange={handlePlanFormChange} type='number' min='1' />
                                                </div>
                                                <div className='form-group'>
                                                    <label>Audience Segment</label>
                                                    <input name='audience' value={planForm.audience} onChange={handlePlanFormChange} placeholder='e.g. Shared households' />
                                                </div>
                                            </div>
                                            <div className='form-group'>
                                                <label>Badge Banner</label>
                                                <input name='badge' value={planForm.badge} onChange={handlePlanFormChange} placeholder='e.g. Most Popular' />
                                            </div>
                                            <div className='form-group'>
                                                <label>Features (comma separated)</label>
                                                <input name='features' value={planForm.features} onChange={handlePlanFormChange} placeholder='Offline access, 4K resolution, Profile sharing' />
                                            </div>
                                            <div className='form-group'>
                                                <label>Description Summary</label>
                                                <textarea name='summary' value={planForm.summary} onChange={handlePlanFormChange} placeholder='Short description about this plan...' rows='3' />
                                            </div>
                                            <div className='editor-form-buttons'>
                                                <button className='btn-primary' onClick={handleSavePlanEdit}>Save Changes</button>
                                                <button className='btn-cancel' onClick={() => setEditingPlanId(null)}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='editor-empty-state'>
                                            <img src={imgurl + 'taskmanager.png'} alt='' style={{ width: '40px', opacity: 0.3, marginBottom: '10px' }} />
                                            <p>Select a subscription plan to edit, or click <strong>New Plan</strong> to add a new pricing package.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* USER & BILLING MODULE */}
                    {activeTab === 'users' && (
                        <div className='users-module'>
                            <div className='module-header-search'>
                                <div>
                                    <h2>User Directory & Billing Management</h2>
                                    <p>Override customer billing cycle, change active plans, toggle administrator access privileges, or terminate accounts.</p>
                                </div>
                                <div className='search-input-box'>
                                    <input 
                                        type='text' 
                                        placeholder='Search by email, name, role...' 
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className='users-table-container'>
                                <table className='users-directory-table'>
                                    <thead>
                                        <tr>
                                            <th>Subscriber Name</th>
                                            <th>Email Address</th>
                                            <th>Role Position</th>
                                            <th>Current Active Plan</th>
                                            <th>Billing Arrangement</th>
                                            <th>Action Controls</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => {
                                                const currentPlan = plans.find(p => p.id === user.activePlanId) || getPlanById(user.activePlanId);
                                                return (
                                                    <tr key={user.id}>
                                                        <td>
                                                            <div className='user-name-cell'>
                                                                <img src={imgurl + 'user.png'} alt='' className='user-avatar-mini' />
                                                                <strong>{user.fullname}</strong>
                                                            </div>
                                                        </td>
                                                        <td className='user-email'>{user.email}</td>
                                                        <td>
                                                            <span className={`role-badge ${user.role.toLowerCase()}`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <select 
                                                                value={user.activePlanId} 
                                                                onChange={(e) => handleUserPlanChange(user.id, e.target.value)}
                                                                className='inline-plan-selector'
                                                            >
                                                                {plans.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <span className={`cycle-pill ${user.billingCycle}`}>
                                                                {user.billingCycle}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className='table-action-buttons'>
                                                                <button 
                                                                    className='btn-action-pill' 
                                                                    onClick={() => handleUserBillingCycleToggle(user.id)}
                                                                    title="Toggle billing cycle"
                                                                >
                                                                    Toggle Billing
                                                                </button>
                                                                <button 
                                                                    className='btn-action-pill' 
                                                                    onClick={() => handleUserRoleToggle(user.id)}
                                                                    title="Toggle user role (Admin/Subscriber)"
                                                                >
                                                                    Toggle Role
                                                                </button>
                                                                {user.email !== adminInfo.email && (
                                                                    <button 
                                                                        className='btn-action-pill danger' 
                                                                        onClick={() => handleUserDelete(user.id)}
                                                                        title="Delete account"
                                                                    >
                                                                        Delete User
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan='6' className='no-records-cell'>No subscribers match your search filter criteria.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            
            <footer className='admin-footer-bar'>
                <span>System Console Log — Session Active: {adminInfo.email}</span>
                <span>Copyright @ 2026 Movie Time. All rights reserved.</span>
            </footer>
        </div>
    );
}
