import React, { useEffect, useState } from 'react';
import './Home.css';
import ProgressBar from './ProgressBar';
import UserManager from './UserManager';
import { addDays, getPlanById, imgurl, subscriptionSeed, getStoredPlans } from '../lib';

const Home = () => {
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

        const stored = JSON.parse(localStorage.getItem('subscription-dashboard-state') || '{}');
        if (stored.user?.role === 'Admin') {
            window.location.replace('/admin');
            return;
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('subscription-dashboard-state', JSON.stringify(subscriptionState));
    }, [subscriptionState]);

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('subscription-dashboard-state');
        window.location.replace('/');
    }

    const syncUserSessionToCatalog = (updatedState) => {
        try {
            const rawUsers = localStorage.getItem('subscription-users-v1');
            if (rawUsers) {
                const users = JSON.parse(rawUsers);
                if (Array.isArray(users)) {
                    const idx = users.findIndex(u => u.email.toLowerCase() === updatedState.user.email.toLowerCase());
                    if (idx >= 0) {
                        users[idx].activePlanId = updatedState.activePlanId;
                        users[idx].billingCycle = updatedState.billingCycle;
                        users[idx].renewalDate = updatedState.renewalDate;
                        localStorage.setItem('subscription-users-v1', JSON.stringify(users));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to sync to catalog', e);
        }
    };

    function setActivePlan(planId) {
        const plan = getPlanById(planId);
        setSubscriptionState((previous) => {
            const updated = {
                ...previous,
                activePlanId: plan.id,
                status: 'Active',
                renewalDate: addDays(new Date(), previous.billingCycle === 'yearly' ? 365 : 30),
            };
            syncUserSessionToCatalog(updated);
            return updated;
        });
        alert(`Successfully subscribed to the ${plan.name} plan!`);
    }

    function toggleBillingCycle() {
        setSubscriptionState((previous) => {
            const updated = {
                ...previous,
                billingCycle: previous.billingCycle === 'monthly' ? 'yearly' : 'monthly',
                renewalDate: addDays(new Date(), previous.billingCycle === 'monthly' ? 365 : 30),
            };
            syncUserSessionToCatalog(updated);
            return updated;
        });
    }

    return (
        <div className='home'>
            <div className='home-header'>
                <div className='brand-row'>
                    <div className='brand-mark'>
                        <img src={imgurl + 'movie-time-brand.svg'} alt='Movie Time logo' />
                    </div>
                </div>
                <div className='home-title'>
                    <h1>Explore Subscription Plans</h1>
                </div>
                <div className='info'>
                    <span>{subscriptionState.user.fullname}</span>
                    <button className='icon-button' onClick={() => logout()}>
                        <img src={imgurl + 'shutdown.png'} alt='Log out' />
                    </button>
                </div>
            </div>
            <div className='home-workspace-simple' style={{ padding: '0 20px', minHeight: '0', overflow: 'auto' }}>
                <UserManager
                    plans={getStoredPlans()}
                    subscriptionState={subscriptionState}
                    onSelectPlan={setActivePlan}
                    onToggleBillingCycle={toggleBillingCycle}
                />
            </div>
            <div className='home-footer'>Copyright @ 2026 Movie Time. All rights reserved.</div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default Home;
