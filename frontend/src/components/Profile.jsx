import React from 'react';
import './Profile.css';
import { computeSavings, formatPlanCycleLabel, formatPlanPrice, getPlanById, imgurl, subscriptionSeed } from '../lib';

const Profile = ({subscriptionState, currentPlan, onToggleBillingCycle, onSelectPlan, onOpenPlans, onLogout}) => {
    const safeState = subscriptionState ?? subscriptionSeed;
    const safePlan = currentPlan ?? getPlanById(safeState.activePlanId);
    const amount = formatPlanPrice(safePlan, safeState.billingCycle);
    const cycleLabel = formatPlanCycleLabel(safeState.billingCycle);
    const savings = computeSavings(safePlan);

    return (
        <div className='profile'>
            <div className='container subscription-summary'>
                {safeState.user?.role === 'Admin' ? (
                    <div className='admin-tools'>
                        <strong>Admin panel</strong>
                        <div className='admin-tools-actions'>
                            <button onClick={() => (window.location.href = '/admin')}>Manage plans</button>
                            <button onClick={() => alert('Manage users not implemented yet')}>Manage users</button>
                            <button onClick={() => alert('Reports not implemented yet')}>View reports</button>
                        </div>
                    </div>
                ) : null}
                <div className='info'>
                    <img src={imgurl + 'myprofile.png'} alt='' />
                    <div className='info-data'>
                        <label>{safeState.user.fullname}</label>
                        <span>{safeState.status} subscription</span>
                    </div>
                    <span className='status-pill'>{safePlan.badge}</span>
                </div>

                <div className='details'>
                    <div className='grid'>
                        <span>Current plan</span>
                        <strong>{safePlan.name}</strong>
                    </div>
                    <div className='grid'>
                        <span>Billing</span>
                        <strong>{amount} / {cycleLabel}</strong>
                    </div>
                    <div className='grid'>
                        <span>Renewal date</span>
                        <strong>{safeState.renewalDate}</strong>
                    </div>
                    <div className='grid'>
                        <span>Plan coverage</span>
                        <strong>{safePlan.devices} devices, {safePlan.quality}</strong>
                    </div>
                    <div className='grid'>
                        <span>User email</span>
                        <strong>{safeState.user.email}</strong>
                    </div>
                    <div className='grid'>
                        <span>Potential annual savings</span>
                        <strong>${savings}</strong>
                    </div>
                </div>

                <div className='subscription-actions'>
                    <button onClick={onOpenPlans}>Explore other plans</button>
                    <button className='ghost' onClick={onToggleBillingCycle}>Toggle billing cycle</button>
                    <button className='ghost danger' onClick={onSelectPlan ? () => onSelectPlan('starter') : undefined}>Switch to Starter</button>
                    <button className='ghost' onClick={onLogout}>Log out</button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
