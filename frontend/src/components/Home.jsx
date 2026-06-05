import React, { useEffect, useMemo, useState } from 'react';
import './Home.css';
import ProgressBar from './ProgressBar';
import Profile from './Profile';
import UserManager from './UserManager';
import { addDays, computeSavings, getPlanById, imgurl, subscriptionSeed, getStoredPlans } from '../lib';

const Home = () => {
    const [activeModule, setActiveModule] = useState('overview');
    const [subscriptionState, setSubscriptionState] = useState(() => {
        const storedState = localStorage.getItem('subscription-dashboard-state');
        if (storedState) {
            try {
                const parsedState = JSON.parse(storedState);
                return {
                    ...subscriptionSeed,
                    ...parsedState,
                    user: {
                        ...subscriptionSeed.user,
                        ...(parsedState.user ?? {}),
                    },
                };
            } catch {
                return subscriptionSeed;
            }
        }

        return subscriptionSeed;
    });
    const [isProgress] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            window.location.replace('/');
            return;
        }

        if (!localStorage.getItem('subscription-dashboard-state')) {
            localStorage.setItem('subscription-dashboard-state', JSON.stringify(subscriptionSeed));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('subscription-dashboard-state', JSON.stringify(subscriptionState));
    }, [subscriptionState]);

    const currentPlan = useMemo(() => getPlanById(subscriptionState.activePlanId), [subscriptionState.activePlanId]);
    const annualSavings = computeSavings(currentPlan);

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('subscription-dashboard-state');
        window.location.replace('/');
    }

    function setActivePlan(planId) {
        const plan = getPlanById(planId);
        setSubscriptionState((previous) => ({
            ...previous,
            activePlanId: plan.id,
            status: 'Active',
            renewalDate: addDays(new Date(), previous.billingCycle === 'yearly' ? 365 : 30),
        }));
        setActiveModule('status');
    }

    function toggleBillingCycle() {
        setSubscriptionState((previous) => ({
            ...previous,
            billingCycle: previous.billingCycle === 'monthly' ? 'yearly' : 'monthly',
            renewalDate: addDays(new Date(), previous.billingCycle === 'monthly' ? 365 : 30),
        }));
    }

    const menuList = [
        { mid: 'overview', menu: 'Overview', icon: 'dashboard.png' },
        { mid: 'plans', menu: 'Plans', icon: 'taskmanager.png' },
        { mid: 'status', menu: 'Status', icon: 'myprofile.png' },
    ];

    // If the signed-in user is an admin, expose an Admin link
    if (subscriptionState.user?.role === 'Admin') {
        menuList.push({ mid: 'admin', menu: 'Admin' });
    }

    const activePanels = {
        overview: (
            <div className='overview-panel'>
                <div className='overview-hero'>
                    <div>
                        <span className='eyebrow'>Subscription command center</span>
                        <h2>{subscriptionState.user.fullname}</h2>
                        <p>
                            Track the active plan, compare options, and make plan changes without leaving the frontend.
                        </p>
                    </div>
                    <button onClick={() => setActiveModule('plans')}>Browse plans</button>
                </div>

                {subscriptionState.user?.role === 'Admin' ? (
                    <div className='admin-duties'>
                        <h3>Admin Duties</h3>
                        <p>As an admin you can manage plans, users, and view reports.</p>
                        <div className='admin-duties-actions'>
                            <button onClick={() => (window.location.href = '/admin')}>Manage plans</button>
                            <button onClick={() => alert('Manage users is not implemented yet.')}>Manage users</button>
                            <button onClick={() => alert('Reports are not implemented yet.')}>View reports</button>
                        </div>
                    </div>
                ) : null}

                <div className='overview-stats'>
                    <article>
                        <span>Active plan</span>
                        <strong>{currentPlan.name}</strong>
                        <p>{currentPlan.badge}</p>
                    </article>
                    <article>
                        <span>Billing cycle</span>
                        <strong>{subscriptionState.billingCycle}</strong>
                        <p>{currentPlan.devices} supported devices</p>
                    </article>
                    <article>
                        <span>Annual savings</span>
                        <strong>${annualSavings}</strong>
                        <p>Switch to yearly billing to unlock the discount</p>
                    </article>
                </div>

                <div className='overview-list'>
                    <div>
                        <span>Search focus</span>
                        <p>{subscriptionState.searchFocus}</p>
                    </div>
                    <div>
                        <span>Next renewal</span>
                        <p>{subscriptionState.renewalDate}</p>
                    </div>
                    <div>
                        <span>Plan audience</span>
                        <p>{currentPlan.audience}</p>
                    </div>
                </div>
            </div>
        ),
        plans: (
            <UserManager
                plans={getStoredPlans()}
                subscriptionState={subscriptionState}
                onSelectPlan={setActivePlan}
                onToggleBillingCycle={toggleBillingCycle}
            />
        ),
        status: (
            <Profile
                subscriptionState={subscriptionState}
                currentPlan={currentPlan}
                onToggleBillingCycle={toggleBillingCycle}
                onSelectPlan={setActivePlan}
                onOpenPlans={() => setActiveModule('plans')}
                onLogout={logout}
            />
        ),
    };

    return (
        <div className='home'>
            <div className='home-header'>
                <div className='brand-row'>
                    <div className='brand-mark'>
                        <img src={imgurl + 'movie-time-brand.svg'} alt='Movie Time logo' />
                    </div>
                </div>
                <div className='home-title'>
                    <h1>Subscription management dashboard</h1>
                </div>
                <div className='info'>
                    <span>{subscriptionState.user.fullname}</span>
                    <button className='icon-button' onClick={() => logout()}>
                        <img src={imgurl + 'shutdown.png'} alt='Log out' />
                    </button>
                </div>
            </div>
            <div className='home-workspace'>
                <div className='home-menus'>
                    <ul>
                        {menuList.map((menu) => (
                            <li
                                key={menu.mid}
                                className={activeModule === menu.mid ? 'active' : ''}
                                onClick={() => {
                                    if (menu.mid === 'admin') {
                                        window.location.href = '/admin';
                                        return;
                                    }
                                    setActiveModule(menu.mid);
                                }}
                            >
                                {menu.icon ? <img src={imgurl + menu.icon} alt='' /> : null}
                                {menu.menu}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className='home-content'>{activePanels[activeModule]}</div>
            </div>
            <div className='home-footer'>Manage users, plans, and subscriptions from one dashboard.</div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default Home;
