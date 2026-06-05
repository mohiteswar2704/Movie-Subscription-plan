import React, { useMemo, useState } from 'react';
import './UserManager.css';
import { formatPlanCycleLabel, formatPlanPrice, imgurl, searchPlans, subscriptionSeed } from '../lib';

const UserManager = ({plans = [], subscriptionState = subscriptionSeed, onSelectPlan, onToggleBillingCycle}) => {
    const [query, setQuery] = useState('');
    const [sortMode, setSortMode] = useState('recommended');

    const filteredPlans = useMemo(() => {
        const matches = searchPlans(plans, query);

        const sortedPlans = [...matches].sort((left, right) => {
            if (sortMode === 'price') return left.monthly - right.monthly;
            if (sortMode === 'devices') return right.devices - left.devices;
            return right.features.length - left.features.length;
        });

        return sortedPlans;
    }, [plans, query, sortMode]);

    function selectPlan(planId) {
        if (onSelectPlan) {
            onSelectPlan(planId);
        }
    }

    return (
        <div className='umanager'>
            <div className='umanager-header'>
                <div>
                    <label>Plan Library</label>
                    <p>Search by feature, audience, billing, or price to find the right plan quickly.</p>
                </div>
                <div className='search-bar'>
                    <img src={imgurl + 'mytask.png'} alt='' />
                    <input
                        type='text'
                        placeholder='Search plans or needs'
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>
            </div>
            <div className='umanager-toolbar'>
                <span>Current plan: {subscriptionState.activePlanId}</span>
                <div className='sort-buttons'>
                    <button className={sortMode === 'recommended' ? 'active' : ''} onClick={() => setSortMode('recommended')}>Recommended</button>
                    <button className={sortMode === 'price' ? 'active' : ''} onClick={() => setSortMode('price')}>Lowest price</button>
                    <button className={sortMode === 'devices' ? 'active' : ''} onClick={() => setSortMode('devices')}>Most devices</button>
                </div>
            </div>

            <div className='umanager-content'>
                <div className='plan-grid'>
                    {filteredPlans.map((plan) => {
                        const isCurrent = subscriptionState.activePlanId === plan.id;
                        return (
                            <article className={`plan-card ${isCurrent ? 'current' : ''}`} key={plan.id}>
                                <div className='plan-head'>
                                    <div>
                                        <span>{plan.badge}</span>
                                        <h4>{plan.name}</h4>
                                    </div>
                                    <label>{plan.audience}</label>
                                </div>

                                <div className='plan-price'>
                                    <strong>{formatPlanPrice(plan, subscriptionState.billingCycle)}</strong>
                                    <span>/{formatPlanCycleLabel(subscriptionState.billingCycle)}</span>
                                </div>

                                <p>{plan.summary}</p>

                                <div className='plan-specs'>
                                    <span>{plan.devices} devices</span>
                                    <span>{plan.quality}</span>
                                    <span>{plan.support}</span>
                                </div>

                                <ul>
                                    {plan.features.map((feature) => (
                                        <li key={feature}>{feature}</li>
                                    ))}
                                </ul>

                                <div className='plan-actions'>
                                    <button onClick={() => selectPlan(plan.id)}>{isCurrent ? 'Current plan' : 'Activate plan'}</button>
                                    <button className='ghost' onClick={onToggleBillingCycle}>Toggle billing</button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            <div className='umanager-footer'>
                <span>{filteredPlans.length} plans shown</span>
                <span>Smart search uses plan name, audience, features, price, and device count.</span>
            </div>
        </div>
    );
};

export default UserManager;
