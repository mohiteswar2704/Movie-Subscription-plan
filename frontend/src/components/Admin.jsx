import React, { useEffect, useState } from 'react';
import './Admin.css';
import { getStoredPlans, savePlans } from '../lib';

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
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyPlan());

    useEffect(() => {
        setPlans(getStoredPlans());
    }, []);

    function editPlan(plan) {
        setEditing(plan.id);
        setForm({ ...plan, features: (plan.features || []).join(', ') });
    }

    function newPlan() {
        const p = emptyPlan();
        setPlans((s) => [p, ...s]);
        setEditing(p.id);
        setForm({ ...p, features: '' });
    }

    function removePlan(planId) {
        const filtered = plans.filter((p) => p.id !== planId);
        setPlans(filtered);
        savePlans(filtered);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    function saveEdit() {
        const normalized = {
            ...form,
            monthly: Number(form.monthly) || 0,
            yearly: Number(form.yearly) || 0,
            devices: Number(form.devices) || 1,
            features: (form.features || '').split(',').map((s) => s.trim()).filter(Boolean),
        };
        const updated = plans.map((p) => (p.id === editing ? { ...p, ...normalized } : p));
        setPlans(updated);
        savePlans(updated);
        setEditing(null);
    }

    return (
        <div className='admin-page'>
            <div className='admin-header'>
                <h2>Admin — Plan Management</h2>
                <div className='admin-actions'>
                    <button onClick={newPlan}>New plan</button>
                </div>
            </div>

            <div className='admin-grid'>
                <div className='admin-list'>
                    {plans.map((plan) => (
                        <div className='admin-card' key={plan.id}>
                            <div className='admin-card-head'>
                                <strong>{plan.name || '(untitled)'}</strong>
                                <div className='admin-card-controls'>
                                    <button onClick={() => editPlan(plan)}>Edit</button>
                                    <button className='danger' onClick={() => removePlan(plan.id)}>Delete</button>
                                </div>
                            </div>
                            <p className='admin-summary'>{plan.summary}</p>
                            <div className='admin-meta'>
                                <span>${plan.monthly}/mo</span>
                                <span>{plan.devices} devices</span>
                                <span>{plan.audience}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='admin-editor'>
                    {editing ? (
                        <div>
                            <h3>Edit plan</h3>
                            <label>Name</label>
                            <input name='name' value={form.name} onChange={handleChange} />
                            <label>Audience</label>
                            <input name='audience' value={form.audience} onChange={handleChange} />
                            <label>Monthly</label>
                            <input name='monthly' value={form.monthly} onChange={handleChange} type='number' />
                            <label>Yearly</label>
                            <input name='yearly' value={form.yearly} onChange={handleChange} type='number' />
                            <label>Devices</label>
                            <input name='devices' value={form.devices} onChange={handleChange} type='number' />
                            <label>Badge</label>
                            <input name='badge' value={form.badge} onChange={handleChange} />
                            <label>Features (comma separated)</label>
                            <input name='features' value={form.features} onChange={handleChange} />
                            <label>Summary</label>
                            <textarea name='summary' value={form.summary} onChange={handleChange} />
                            <div className='editor-actions'>
                                <button onClick={saveEdit}>Save</button>
                                <button onClick={() => setEditing(null)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className='editor-empty'>Select a plan to edit or create a new one.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
