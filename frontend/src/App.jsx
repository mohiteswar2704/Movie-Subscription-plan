import { useEffect, useRef, useState } from 'react';
import './App.css';
import ProgressBar from './components/ProgressBar.jsx';
import { apibaseurl, imgurl, subscriptionSeed } from './lib';

const API_BASE = apibaseurl;

const App = () => {
    const [isSignin, setIsSignin] = useState(true);
    const [isProgress, setIsProgress] = useState(false);
    const [errorData, setErrorData] = useState({});
    const focusRef = useRef(null);

    function storeLocalSession(fullname, email) {
        const storedState = {
            ...subscriptionSeed,
            user: {
                ...subscriptionSeed.user,
                fullname,
                email,
            },
        };

        localStorage.setItem('token', `local-${Date.now()}`);
        localStorage.setItem('subscription-dashboard-state', JSON.stringify(storedState));
        // if local session represents an admin, redirect to admin area
        if (storedState.user?.role === 'Admin') {
            window.location.replace('/admin');
        } else {
            window.location.replace('/home');
        }
    }

    async function readResponseMessage(response) {
        const responseText = await response.text();

        try {
            const parsed = JSON.parse(responseText);
            return parsed.message || parsed.detail || responseText;
        } catch {
            return responseText;
        }
    }

    const [signupData, setSignupData] = useState({
        fullname: '',
        phone: '',
        email: '',
        password: '',
        retypepassword: '',
    });

    const [signinData, setSigninData] = useState({
        username: '',
        password: '',
    });

    useEffect(() => {
        if (localStorage.getItem('token')) {
            try {
                const stored = JSON.parse(localStorage.getItem('subscription-dashboard-state') || '{}');
                if (stored.user?.role === 'Admin') {
                    window.location.replace('/admin');
                    return;
                }
            } catch {}

            window.location.replace('/home');
            return;
        }

        window.setTimeout(() => {
            focusRef.current?.focus();
        }, 0);
    }, [isSignin]);

    function switchWindow() {
        setIsSignin((previous) => !previous);
        setErrorData({});
        setSigninData({ username: '', password: '' });
        setSignupData({ fullname: '', phone: '', email: '', password: '', retypepassword: '' });
    }

    function handleSigninInput(event) {
        const { name, value } = event.target;
        setSigninData((previous) => ({ ...previous, [name]: value }));
    }

    function handleSignupInput(event) {
        const { name, value } = event.target;
        setSignupData((previous) => ({ ...previous, [name]: value }));
    }

    function validateSignup() {
        const errors = {};
        if (!signupData.fullname) errors.fullname = true;
        if (!signupData.phone) errors.phone = true;
        if (!signupData.email) errors.email = true;
        if (!signupData.password) errors.password = true;
        if (!signupData.retypepassword || signupData.password !== signupData.retypepassword) errors.retypepassword = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function validateSignin() {
        const errors = {};
        if (!signinData.username) errors.username = true;
        if (!signinData.password) errors.password = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    async function signin() {
        if (validateSignin()) return;

        setIsProgress(true);
        try {
            const loginIdentifier = signinData.username.trim();
            const response = await fetch(`${API_BASE}/authservice/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginIdentifier,
                    email: loginIdentifier,
                    password: signinData.password,
                }),
            });

            if (!response.ok) {
                if (import.meta.env.DEV && response.status >= 500) {
                    storeLocalSession(loginIdentifier, loginIdentifier);
                    return;
                }

                alert(await readResponseMessage(response));
                return;
            }

            const result = await response.json();

            if (result.code !== 200) {
                alert(result.message);
                return;
            }

            localStorage.setItem('token', result.jwt);

            // store basic subscription state so Home can show the user name
            const userFullname = result.user?.fullname || loginIdentifier;
            const userEmail = result.user?.email || loginIdentifier;
            const storedState = {
                ...subscriptionSeed,
                user: {
                    ...subscriptionSeed.user,
                    fullname: userFullname,
                    email: userEmail,
                },
            };
            localStorage.setItem('subscription-dashboard-state', JSON.stringify(storedState));

            window.location.replace('/home');
        } catch (error) {
            alert(error.message);
        } finally {
            setIsProgress(false);
        }
    }

    async function signInAndRedirect(username, password) {
        const response = await fetch(`${API_BASE}/authservice/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email: username, password }),
        });

        if (!response.ok) {
            if (import.meta.env.DEV && response.status >= 500) {
                storeLocalSession(username, username);
                return;
            }

            throw new Error(await readResponseMessage(response));
        }

        const result = await response.json();

        if (result.code !== 200) {
            throw new Error(result.message);
        }

        localStorage.setItem('token', result.jwt);

        // if backend returns a user object, update stored subscription state
        const userFullname = result.user?.fullname || username;
        const userEmail = result.user?.email || username;
        const storedState = {
            ...subscriptionSeed,
            user: {
                ...subscriptionSeed.user,
                fullname: userFullname,
                email: userEmail,
            },
        };
        localStorage.setItem('subscription-dashboard-state', JSON.stringify(storedState));

        window.location.replace('/home');
    }

    async function signup() {
        if (validateSignup()) return;

        setIsProgress(true);
        try {
            const payload = {
                fullname: signupData.fullname,
                phone: signupData.phone,
                email: signupData.email,
                password: signupData.password,
            };

            const response = await fetch(`${API_BASE}/authservice/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                if (import.meta.env.DEV && response.status >= 500) {
                    storeLocalSession(payload.fullname, payload.email);
                    return;
                }

                alert(await readResponseMessage(response));
                return;
            }

            const result = await response.json();

            if (result.code === 200) {
                alert(result.message);
                // pre-populate subscription state with the signed-up user's name
                const storedState = {
                    ...subscriptionSeed,
                    user: {
                        ...subscriptionSeed.user,
                        fullname: payload.fullname,
                        email: payload.email,
                    },
                };
                localStorage.setItem('subscription-dashboard-state', JSON.stringify(storedState));

                await signInAndRedirect(payload.email, payload.password);
                return;
            }

            alert(result.message);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsProgress(false);
        }
    }

    return (
        <div className='app auth-shell'>
            <section className='auth-card'>
                <div className='auth-brand'>
                    <div className='brand-mark'>
                        <img src={imgurl + 'movie-time-brand.svg'} alt='Movie Time logo' />
                    </div>
                </div>

                <div className='auth-copy'>
                    <span className='eyebrow'>Sign in to continue</span>
                    <h1>Manage your plans, subscriptions, and billing from one place.</h1>
                    <p>
                        Create an account to save your details in PostgreSQL, then sign in to explore plans and manage your
                        subscription dashboard.
                    </p>
                </div>

                <div className='auth-panel' key={isSignin ? 'signin' : 'signup'}>
                    {isSignin ? (
                        <>
                            <label>Username*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'user.png'} alt='' />
                                <input
                                    type='text'
                                    ref={focusRef}
                                    className={errorData.username ? 'error' : ''}
                                    placeholder='Enter email id'
                                    autoComplete='off'
                                    name='username'
                                    value={signinData.username}
                                    onChange={handleSigninInput}
                                />
                            </div>

                            <label>Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'padlock.png'} alt='' />
                                <input
                                    type='password'
                                    className={errorData.password ? 'error' : ''}
                                    placeholder='Enter password'
                                    name='password'
                                    value={signinData.password}
                                    onChange={handleSigninInput}
                                />
                            </div>

                            <button onClick={signin}>Sign in</button>
                            <label onClick={switchWindow} className='switch-link'>
                                Don’t have an account? <span>Sign up</span>
                            </label>
                        </>
                    ) : (
                        <>
                            <label>Full Name*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'user.png'} alt='' />
                                <input
                                    type='text'
                                    ref={focusRef}
                                    className={errorData.fullname ? 'error' : ''}
                                    placeholder='Enter full name'
                                    autoComplete='off'
                                    name='fullname'
                                    value={signupData.fullname}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Mobile Number*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'phone.png'} alt='' />
                                <input
                                    type='text'
                                    className={errorData.phone ? 'error' : ''}
                                    placeholder='Enter mobile number'
                                    autoComplete='off'
                                    name='phone'
                                    value={signupData.phone}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Email Address*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'email.png'} alt='' />
                                <input
                                    type='text'
                                    className={errorData.email ? 'error' : ''}
                                    placeholder='Enter email id'
                                    autoComplete='off'
                                    name='email'
                                    value={signupData.email}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'padlock.png'} alt='' />
                                <input
                                    type='password'
                                    className={errorData.password ? 'error' : ''}
                                    placeholder='Enter password'
                                    autoComplete='off'
                                    name='password'
                                    value={signupData.password}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Re-type Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + 'padlock.png'} alt='' />
                                <input
                                    type='password'
                                    className={errorData.retypepassword ? 'error' : ''}
                                    placeholder='Re-type your password'
                                    autoComplete='off'
                                    name='retypepassword'
                                    value={signupData.retypepassword}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <button onClick={signup}>Sign up</button>
                            <label onClick={switchWindow} className='switch-link'>
                                Already have an account? <span>Sign in</span>
                            </label>
                        </>
                    )}
                </div>

                <div className='auth-footer'>Copyright @ 2026. All rights reserved.</div>
            </section>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default App;
