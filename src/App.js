import React, { useState, useEffect, useReducer } from 'react';
import { User, BookOpen, Trophy, Clock, CheckCircle, XCircle, BarChart3, CreditCard, LogOut, Settings, Home, ArrowRight, Target, TrendingUp, Award, RotateCcw, Phone } from 'lucide-react';
import { Menu, X } from 'lucide-react';

//const API_BASE_URL = 'https://yourtutor.pythonanywhere.com/api';
const API_BASE_URL = 'http://localhost:8000/api'; // Adjust to your backend URL

// Auth Context
const AuthContext = React.createContext();

// Utility functions
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// API service
const apiService = {
  // Add these methods to your existing apiService object:
  async submitQuiz(token, subtopicId, answers, timeTaken) {
    return this.request('/quiz/submit/', {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subtopic_id: subtopicId,
        answers: answers,
        time_taken: timeTaken
      })
    });
  },

  async getQuizResults(token, attemptId) {
    return this.request(`/quiz/results/${attemptId}/`, {
      headers: {
        Authorization: `Token ${token}`
      }
    });
  },


  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Token ${token}` }),
        ...options.headers
      },
      ...options
    };

    console.log('Request config:', { endpoint, config }); // Debug log

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      console.log('Response status:', response.status); // Debug log
      
      const data = await response.json();
      console.log('Response data:', data); // Debug log
      
      if (!response.ok) {
        throw new Error(data.message || data.detail || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  // Auth endpoints
  async login(username, password) {
    console.log('Login attempt:', { username, password }); // Debug log
    const response = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    console.log('Login response:', response); // Debug log
    return response;
  },

  async register(userData) {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getProfile() {
    return this.request('/auth/profile/');
  },

  // Quiz endpoints
  async getSubjects() {
    return this.request('/subjects/');
  },

  async getSubject(slug) {
    return this.request(`/subjects/${slug}/`);
  },

  async getSubtopic(subjectSlug, topicSlug, subtopicSlug) {
    return this.request(`/subjects/${subjectSlug}/topics/${topicSlug}/subtopics/${subtopicSlug}/`);
  },


  // Subscription endpoints
  async getSubscriptions() {
    return this.request('/subscriptions/');
  },

  //Get quiz attempts
  async getQuizAttempts() {
    return this.request('/quiz/attempts/');
  },
  

  async checkSubjectAccess(subjectSlug) {
    return this.request(`/subjects/${subjectSlug}/access/`);
  },

  // Payment endpoints
  async initiatePayment(paymentData) {
    return this.request('/payments/initiate/', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  // 4. FIND your apiService object and ADD these two methods to it:
  // (Add these inside your existing apiService object)
  async requestPasswordReset(email) {
    return this.request('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(token, newPassword) {
    return this.request('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
  },

  // Add these methods to your apiService object:
  async verifyEmail(token) {
    return this.request('/auth/verify-email/', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async resendVerification(email) {
    return this.request('/auth/resend-verification/', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },  

  async getPaymentHistory() {
    return this.request('/payments/history/');
  }
};

// Quiz State Management
const initialQuizState = {
  currentQuiz: null,
  currentQuestionIndex: 0,
  answers: [],
  quizStartTime: null,
  timeRemaining: 0,
  isTimerRunning: false,
  loading: false,
  error: null,
  quizResults: null,
  currentSubtopic: null,
  token: null
};

const quizReducer = (state, action) => {
  switch (action.type) {
    case 'START_QUIZ':
      return {
        ...state,
        currentQuiz: action.payload.quiz,
        currentSubtopic: action.payload.subtopic,
        answers: new Array(action.payload.quiz.questions.length).fill(null),
        currentQuestionIndex: 0,
        quizStartTime: Date.now(),
        timeRemaining: action.payload.timeLimit || 0,
        isTimerRunning: true,
        error: null
      };
    case 'ANSWER_QUESTION':
      const newAnswers = [...state.answers];
      newAnswers[state.currentQuestionIndex] = action.payload;
      return { ...state, answers: newAnswers };
    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.currentQuiz.questions.length - 1)
      };
    case 'PREVIOUS_QUESTION':
      return {
        ...state,
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0)
      };
    case 'TOGGLE_TIMER':
      return { ...state, isTimerRunning: !state.isTimerRunning };
    case 'UPDATE_TIMER':
      return { ...state, timeRemaining: Math.max(0, state.timeRemaining - 1) };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'FINISH_QUIZ':
      return {
        ...state,
        quizResults: action.payload,
        isTimerRunning: false,
        loading: false
      };
    case 'SET_QUIZ_RESULTS':
      return { ...state, quizResults: action.payload };
    case 'RESET_QUIZ':
      return { ...initialQuizState, token: state.token };
    case 'GO_HOME':
      return { ...initialQuizState, token: state.token };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    default:
      return state;
  }
};

// Timer Component
const Timer = ({ timeRemaining, isRunning, onToggle }) => {
  const formatTimerTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-5 h-5 text-blue-600" />
      <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`}>
        {formatTimerTime(timeRemaining)}
      </span>
      <button
        onClick={onToggle}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);


// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid by fetching profile
      apiService.getProfile()
        .then(response => {
          if (response.success) {
            const updatedUser = { ...JSON.parse(savedUser), ...response.profile };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiService.login(username, password);
      if (response.success) {
        localStorage.setItem('token', response.token);
        
        // Fetch full profile
        const profileResponse = await apiService.getProfile();
        const userData = {
          id: response.user_id,
          username: response.username,
          ...profileResponse.profile
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
// 2. FIND your existing LoginForm component and REPLACE it entirely with this:
const LoginForm = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'forgot-password'
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.username, formData.password);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle different views
  if (currentView === 'register') {
    return <RegistrationForm onSwitchToLogin={() => setCurrentView('login')} />;
  }

  if (currentView === 'forgot-password') {
    return <ForgotPasswordForm onSwitchToLogin={() => setCurrentView('login')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">YourTutor</h1>
          <p className="text-gray-600 mt-2">Sign in to continue learning</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setCurrentView('forgot-password')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Forgot your password?
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentView('register')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// 3. ADD these 4 components RIGHT AFTER your LoginForm component:

// Registration Component
const RegistrationForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    password_confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.register(formData);
      
      if (response.success) {
        setSuccess(true);
        // Auto-switch to login after successful registration
        setTimeout(() => {
          onSwitchToLogin();
        }, 2000);
      } else {
        setError(response.errors ? 
          Object.values(response.errors).flat().join(', ') : 
          'Registration failed'
        );
      }
    } catch (error) {
      setError(error.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully. You will be redirected to the login page.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join YourTutor today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="e.g., 0705251258"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter Uganda phone number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength="8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Forgot Password Component
const ForgotPasswordForm = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.requestPasswordReset(email);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Failed to send reset email. Please try again.');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">Enter your email to receive reset instructions</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Remember your password?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Password Reset Confirmation Component
const PasswordResetConfirm = ({ token, onComplete }) => {
  const [formData, setFormData] = useState({
    password: '',
    password_confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.resetPassword(token, formData.password);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength="8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Password Reset Handler Component - UPDATED VERSION
const PasswordResetHandler = () => {
  const [token, setToken] = useState('');
  const [validToken, setValidToken] = useState(null);
  
  useEffect(() => {
    // First try URL search params
    let resetToken = new URLSearchParams(window.location.search).get('token');
    
    // If not found in search params, try hash
    if (!resetToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      resetToken = hashParams.get('token');
    }
    
    if (resetToken) {
      setToken(resetToken);
      setValidToken(true);
    } else {
      setValidToken(false);
    }
  }, []);

  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (validToken && token) {
    return (
      <PasswordResetConfirm 
        token={token} 
        onComplete={() => window.location.href = '/'} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};


// Enhanced Quiz Component
const Quiz = ({ state, dispatch, navigate }) => {

  const handleFinish = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const timeTaken = Math.floor((Date.now() - state.quizStartTime) / 1000);
      
      const result = await apiService.submitQuiz(
        state.token,
        state.currentSubtopic.id,
        state.answers,
        timeTaken
      );
      
      if (result.success) {
        dispatch({ 
          type: 'FINISH_QUIZ', 
          payload: { 
            score: result.score,
            total_questions: result.total_questions,
            time_taken: timeTaken,
            quizAttemptId: result.quiz_attempt_id
          } 
        });

        const detailedResults = await apiService.getQuizResults(state.token, result.quiz_attempt_id);
        if (detailedResults.success) {
          dispatch({ type: 'SET_QUIZ_RESULTS', payload: detailedResults });
        }
        
        navigate(`/results/${result.quiz_attempt_id}`);
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to submit quiz' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };  

  useEffect(() => {
    let interval;
    if (state.isTimerRunning && state.timeRemaining > 0) {
      interval = setInterval(() => {
        dispatch({ type: 'UPDATE_TIMER' });
      }, 1000);
    } else if (state.timeRemaining === 0 && state.isTimerRunning) {
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [state.isTimerRunning, state.timeRemaining, state.quizStartTime, state.token, state.currentSubtopic, state.answers, navigate, dispatch]);

  if (!state.currentQuiz?.questions || state.currentQuiz.questions.length === 0) {
    return (
      <div className="text-center">
        <p className="text-gray-600">No questions available for this quiz.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Back to Subtopics
        </button>
      </div>
    );
  }

  const currentQuestion = state.currentQuiz.questions[state.currentQuestionIndex];
  const totalQuestions = state.currentQuiz.questions.length;
  const progress = ((state.currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (answerIndex) => {
    dispatch({ type: 'ANSWER_QUESTION', payload: answerIndex });
  };

  const handleNext = () => {
    if (state.currentQuestionIndex < totalQuestions - 1) {
      dispatch({ type: 'NEXT_QUESTION' });
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    dispatch({ type: 'PREVIOUS_QUESTION' });
  };


  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Question {state.currentQuestionIndex + 1} of {totalQuestions}
        </h2>
        <Timer 
          timeRemaining={state.timeRemaining}
          isRunning={state.isTimerRunning}
          onToggle={() => dispatch({ type: 'TOGGLE_TIMER' })}
        />
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options?.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                state.answers[state.currentQuestionIndex] === index
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium mr-3">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={state.currentQuestionIndex === 0}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex space-x-4">
          <button
            onClick={handleFinish}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Finish Quiz
          </button>
          
          {state.currentQuestionIndex < totalQuestions - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Complete Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Results Component
const Results = ({ state, dispatch, navigate }) => {
  if (!state.quizResults) {
    return <LoadingSpinner />;
  }

  const { score, total_questions, time_taken, results } = state.quizResults;
  const percentage = Math.round((score / total_questions) * 100);
  
  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const gradeInfo = getGrade();

  const formatTimerTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className={`${gradeInfo.bg} rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center`}>
        <span className={`text-4xl font-bold ${gradeInfo.color}`}>
          {gradeInfo.grade}
        </span>
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-4">Quiz Complete!</h2>
      
      <div className="bg-white p-8 rounded-lg shadow-lg mb-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-500 mr-2" />
              <span className="text-2xl font-bold text-green-600">{score}</span>
            </div>
            <p className="text-gray-600">Correct</p>
          </div>
          
          <div>
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-red-500 mr-2" />
              <span className="text-2xl font-bold text-red-600">{total_questions - score}</span>
            </div>
            <p className="text-gray-600">Incorrect</p>
          </div>

          <div>
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-blue-500 mr-2" />
              <span className="text-2xl font-bold text-blue-600">{formatTimerTime(time_taken)}</span>
            </div>
            <p className="text-gray-600">Time Taken</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-lg text-gray-700">
            You scored <span className="font-bold text-2xl">{percentage}%</span>
          </p>
          <p className="text-sm text-gray-500">
            {score} out of {total_questions} questions correct
          </p>
        </div>

        {results && results.length > 0 && (
          <div className="text-left mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review:</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className={`border-l-4 pl-4 ${result.is_correct ? 'border-green-400' : 'border-red-400'}`}>
                  <p className="font-medium text-gray-900 mb-2">
                    {index + 1}. {result.question}
                  </p>
                  <div className="text-sm space-y-1">
                    <p className={`${result.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      Your answer: {result.user_answer !== null && result.options ? result.options[result.user_answer] : 'Not answered'}
                      {result.is_correct ? ' ✓' : ' ✗'}
                    </p>
                    {!result.is_correct && result.options && (
                      <p className="text-green-600">
                        Correct answer: {result.options[result.correct_answer]}
                      </p>
                    )}
                    {result.explanation && (
                      <p className="text-gray-600 italic">
                        Explanation: {result.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4 justify-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Take Another Quiz
        </button>
        
        <button
          onClick={() => {
            dispatch({ type: 'GO_HOME' });
            navigate('/');
          }}
          className="flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

// Subscription Activation Component
const SubscriptionActivation = ({ subject, onBack }) => {
  const { user } = useAuth();
  
  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg text-center">
      <div className="mb-6">
        <Phone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Activate Your Subscription</h2>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{subject?.name}</h3>
        <p className="text-2xl font-bold text-blue-600 mb-2">UGX {subject?.price?.toLocaleString()}</p>
        <p className="text-sm text-gray-600">30 days access to all quizzes</p>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h4 className="font-bold text-yellow-800 mb-3">To activate your subscription:</h4>
        <div className="text-left text-yellow-700 space-y-2">
          <p className="flex items-center">
            <Phone className="w-4 h-4 mr-2" />
            <span className="font-semibold">Call or WhatsApp:</span>
          </p>
          <p className="ml-6 font-bold text-lg">0705 251 258</p>
          <p className="ml-6 font-bold text-lg">0780 513 947</p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
        <h5 className="font-semibold text-gray-900 mb-2">What to mention when calling:</h5>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Your username: <span className="font-medium">{user?.username}</span></li>
          <li>Subject you want to subscribe to: <span className="font-medium">{subject?.name}</span></li>
          <li>Preferred payment method (MTN/Airtel Mobile Money)</li>
        </ul>
      </div>
      
      <p className="text-sm text-gray-600 mb-6">
        The admin will help you complete the payment process and activate your subscription immediately.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Back to Subjects
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          I've Already Paid - Refresh Page
        </button>
      </div>
    </div>
  );
};

// Subjects Component
// Enhanced Subjects Component with Quiz Integration
const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizState, dispatch] = useReducer(quizReducer, initialQuizState);
  const [currentView, setCurrentView] = useState('subjects');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(null);

  useEffect(() => {
    loadSubjects();
    const token = localStorage.getItem('token');
    if (token) {
      dispatch({ type: 'SET_TOKEN', payload: token });
    }
  }, []);

  const loadSubjects = async () => {
    try {
      const [subjectsResponse, subscriptionsResponse] = await Promise.all([
        apiService.getSubjects(),
        apiService.getSubscriptions()
      ]);

      if (subjectsResponse) {
        setSubjects(subjectsResponse);
      }

      if (subscriptionsResponse.success) {
        setSubscriptions(subscriptionsResponse.subscriptions);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = (subjectId) => {
    return subscriptions.some(sub => 
      sub.subject_name && subjects.find(s => s.id === subjectId && s.name === sub.subject_name)
    );
  };

  const handleSubjectClick = async (subject) => {
    if (!isSubscribed(subject.id)) {
      setShowSubscriptionModal(subject);
      return;
    }
    
    try {
      const response = await apiService.getSubject(subject.slug);
      setSelectedSubject({ ...subject, ...response });
    } catch (error) {
      console.error('Error loading subject details:', error);
    }
  };

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
  };


  const handleSubtopicClick = async (subtopic) => {
    try {
      const response = await apiService.getSubtopic(
        selectedSubject.slug,
        selectedTopic.slug,
        subtopic.slug
      );
      
      if (response.success) {
        dispatch({
          type: 'START_QUIZ',
          payload: {
            quiz: { questions: response.subtopic.questions },
            subtopic: { id: response.subtopic.id, name: response.subtopic.name },
            timeLimit: 300
          }
        });
        setCurrentView('quiz');
      }
    } catch (error) {
      console.error('Error loading subtopic:', error);
    }
  };

  const navigate = (path) => {
    if (path === -1 || path === '/') {
      if (currentView === 'quiz') {
        setCurrentView('subtopics');
      } else if (currentView === 'results') {
        setCurrentView('subjects');
        dispatch({ type: 'RESET_QUIZ' });
      } else if (currentView === 'subtopics') {
        setCurrentView('topics');
      } else if (currentView === 'topics') {
        setCurrentView('subjects');
      }
    } else if (path.startsWith('/results/')) {
      setCurrentView('results');
    }
  };

  // Quiz View
  if (currentView === 'quiz') {
    return <Quiz state={quizState} dispatch={dispatch} navigate={navigate} />;
  }

  // Results View
  if (currentView === 'results') {
    return <Results state={quizState} dispatch={dispatch} navigate={navigate} />;
  }  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show subscription activation modal
  if (showSubscriptionModal) {
    return (
      <SubscriptionActivation 
        subject={showSubscriptionModal} 
        onBack={() => setShowSubscriptionModal(null)} 
      />
    );
  }

  // Subtopics View
  // Subtopics View
  if (selectedTopic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSelectedTopic(null)}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Topics
          </button>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">{selectedTopic.name} - Subtopics</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {selectedTopic.subtopics?.map((subtopic) => (
              <div key={subtopic.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{subtopic.name}</h3>
                <p className="text-gray-600 mb-4">{subtopic.question_count || 0} questions</p>
                <button
                  onClick={() => handleSubtopicClick(subtopic)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Start Quiz
                </button>
              </div>
            )) || (
              <p className="col-span-full text-center text-gray-500 py-8">
                No subtopics available for this topic
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Topics View
  // Topics View
  if (selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              setSelectedSubject(null);
              setSelectedTopic(null);
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Subjects
          </button>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">{selectedSubject.name} Topics</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {selectedSubject.topics?.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic)}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg border-l-4 border-blue-500 transition-all duration-200 text-left"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{topic.name}</h3>
                <p className="text-gray-600">{topic.subtopics?.length || 0} subtopic(s)</p>
              </button>
            )) || (
              <p className="col-span-full text-center text-gray-500 py-8">
                No topics available for this subject
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  // Subjects View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Available Subjects</h1>
        <p className="text-gray-600">Choose a subject to start practicing quizzes</p>
      </div>

      {/* Admin Contact Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Need a Subscription?</h2>
        <p className="text-blue-800 mb-4">
          To access quiz content, you need an active subscription. Contact the admin to activate your subscription:
        </p>
        <div className="space-y-2 text-blue-800">
          <p><strong>Call or WhatsApp:</strong> +256705251258</p>
          <p><strong>Email:</strong> timmehta71@gmail.com</p>
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => {
          const subscribed = isSubscribed(subject.id);
          return (
            <div key={subject.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-4 ${subject.color || 'bg-blue-500'}`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                  {subscribed && (
                    <div className="text-right">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full block mb-1">
                        Subscribed
                      </span>
                      <span className="text-xs text-gray-600">
                        {(() => {
                          const subscription = subscriptions.find(sub => 
                            sub.subject_name === subject.name
                          );
                          return subscription ? `${subscription.days_remaining} days left` : '';
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-2xl font-bold text-blue-600">
                    UGX {subject.price?.toLocaleString('en-UG') || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {subject.topics?.length || 0} topics available
                  </p>
                </div>

                {subscribed ? (
                  <button
                    onClick={() => handleSubjectClick(subject)}
                    className="w-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Access Quizzes
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubjectClick(subject)}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    Subscribe Now
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </button>                
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    totalTime: 0,
    bestScore: 0,
    recentAttempts: [],
    subjectProgress: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const attemptsResponse = await apiService.getQuizAttempts();

      if (attemptsResponse && attemptsResponse.success) {
        const attempts = attemptsResponse.attempts;
        const totalAttempts = attempts.length;
        const averageScore = totalAttempts > 0 
          ? attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions * 100), 0) / totalAttempts
          : 0;
        const totalTime = attempts.reduce((sum, attempt) => sum + attempt.time_taken, 0);
        const bestScore = Math.max(...attempts.map(attempt => attempt.score / attempt.total_questions * 100), 0);
        
        // Subject progress calculation - fix the name extraction
        const subjectProgress = {};
        attempts.forEach(attempt => {
          // Extract subject name from subtopic_name (format: "Subject - Topic - Subtopic")
          const parts = attempt.subtopic_name.split(' - ');
          const subjectName = parts[0] || attempt.subtopic_name;
          
          if (!subjectProgress[subjectName]) {
            subjectProgress[subjectName] = { attempts: 0, totalScore: 0, bestScore: 0 };
          }
          const score = attempt.score / attempt.total_questions * 100;
          subjectProgress[subjectName].attempts++;
          subjectProgress[subjectName].totalScore += score;
          subjectProgress[subjectName].bestScore = Math.max(subjectProgress[subjectName].bestScore, score);
        });

        setStats({
          totalAttempts,
          averageScore: Math.round(averageScore),
          totalTime,
          bestScore: Math.round(bestScore),
          recentAttempts: attempts.slice(0, 5),
          subjectProgress: Object.entries(subjectProgress).map(([name, data]) => ({
            name,
            averageScore: Math.round(data.totalScore / data.attempts),
            bestScore: Math.round(data.bestScore),
            attempts: data.attempts
          }))
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}!</h1>
        <p className="opacity-90 mt-2">Ready to continue your learning journey?</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Quiz Attempts</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Best Score</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.bestScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Time</h3>
              <p className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quiz Attempts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Recent Quiz Attempts
          </h2>
          {stats.recentAttempts.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAttempts.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{attempt.subtopic_name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(attempt.started_at)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${
                        (attempt.score / attempt.total_questions * 100) >= 70 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {Math.round(attempt.score / attempt.total_questions * 100)}%
                      </span>
                      {(attempt.score / attempt.total_questions * 100) >= 70 
                        ? <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                        : <XCircle className="w-5 h-5 text-red-600 ml-2" />
                      }
                    </div>
                    <p className="text-sm text-gray-500">{attempt.score}/{attempt.total_questions}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No quiz attempts yet. Start your first quiz!</p>
          )}
        </div>

        {/* Subject Progress */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Subject Progress
          </h2>
          {stats.subjectProgress.length > 0 ? (
            <div className="space-y-4">
              {stats.subjectProgress.map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{subject.name}</h3>
                    <span className="text-sm text-gray-500">{subject.attempts} attempts</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                          style={{ width: `${subject.averageScore}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Avg: {subject.averageScore}%
                    </span>
                    <span className="text-sm text-green-600">
                      Best: {subject.bestScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No subject progress data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Progress Component
const Progress = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      const response = await apiService.getQuizAttempts();
      if (response && response.success) {
        setAttempts(response.attempts);
      }
    } catch (error) {
      console.error('Error loading attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (attemptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiService.getQuizResults(token, attemptId);
      if (response && response.success) {
        setResults(response);
        setSelectedAttempt(attemptId);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedAttempt && results) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              setSelectedAttempt(null);
              setResults(null);
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            ←  Back to Progress
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${results.score/results.total_questions >= 0.7 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.round((results.score/results.total_questions) * 100)}%
              </div>
              <p className="text-gray-600">Overall Score</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {results.score}/{results.total_questions}
              </div>
              <p className="text-gray-600">Correct Answers</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatTime(results.time_taken)}
              </div>
              <p className="text-gray-600">Time Taken</p>
            </div>
          </div>

          <div className="space-y-4">
            {results.results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                result.is_correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${result.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                    {result.is_correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Question {index + 1}: {result.question}
                    </h3>
                    <div className="space-y-1">
                      {result.options.map((option, optIndex) => (
                        <div key={optIndex} className={`p-2 rounded ${
                          optIndex === result.correct_answer ? 'bg-green-100 text-green-800' :
                          optIndex === result.user_answer && !result.is_correct ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}. {option}
                            {optIndex === result.correct_answer && <span className="ml-2">✓</span>}
                            {optIndex === result.user_answer && optIndex !== result.correct_answer && <span className="ml-2">✗</span>}
                        </div>
                      ))}
                    </div>
                    {result.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {result.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Progress</h1>
        <p className="text-gray-600">Track your quiz performance over time</p>
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Quiz Attempts Yet</h3>
          <p className="text-gray-600 mb-6">Start taking quizzes to track your progress</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Browse Subjects
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attempts.map((attempt, index) => {
                  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {attempt.subtopic_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-bold ${
                            percentage >= 70 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {percentage}%
                          </div>
                          <div className="ml-2 text-xs text-gray-500">
                            ({attempt.score}/{attempt.total_questions})
                          </div>
                          {percentage >= 70 ? (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 ml-2" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(attempt.time_taken)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(attempt.started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => loadResults(attempt.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Sidebar Component
// 2. Replace your existing Sidebar component with this updated version
const Sidebar = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const handleItemClick = (itemId) => {
    setActiveView(itemId);
    // Close sidebar on mobile when item is selected
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        bg-white h-full shadow-sm border-r flex flex-col transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative md:z-auto
        fixed inset-y-0 left-0 w-64
      `}>
        {/* Logo and User Info */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-10 h-10 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">YourTutor</h1>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user?.first_name || user?.username}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeView === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

// Payments Component
const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const [paymentsResponse, subscriptionsResponse] = await Promise.all([
        apiService.getPaymentHistory(),
        apiService.getSubscriptions()
      ]);

      if (paymentsResponse.success) {
        setPayments(paymentsResponse.payments);
      }

      if (subscriptionsResponse.success) {
        setSubscriptions(subscriptionsResponse.subscriptions);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payments & Subscriptions</h1>
        <p className="text-gray-600">Manage your subscriptions and payment history</p>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Active Subscriptions</h2>
        </div>
        <div className="p-6">
          {subscriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((subscription, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{subscription.subject_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      subscription.is_expired 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {subscription.is_expired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Expires: {formatDate(subscription.expires_at)}</p>
                    <p>{subscription.days_remaining} days remaining</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No active subscriptions</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length > 0 ? (
                payments.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.subject_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      UGX {payment.amount?.toLocaleString('en-UG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No payment history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={user?.first_name || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={user?.last_name || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={user?.phone_number || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network Provider
              </label>
              <input
                type="text"
                value={user?.network_provider || 'Not specified'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              To update your profile information, please contact support at timmehta71@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Layout Component
// 3. Replace your existing Layout component with this updated version
const Layout = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'subjects':
        return <Subjects />;
      case 'progress':
        return <Progress />;
      case 'payments':
        return <Payments />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen bg-gray-50">
      {/* Mobile header with menu button - Always visible on mobile */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between relative z-30">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-8 h-8 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">YourTutor</h1>
        </div>
      </div>

      <div className="flex h-full md:h-screen">
        {/* Single sidebar that works for both desktop and mobile */}
        <div className="w-64 flex-shrink-0 hidden md:block">
          <Sidebar 
            activeView={activeView} 
            setActiveView={setActiveView}
            isOpen={true}
            setIsOpen={() => {}}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <Sidebar 
            activeView={activeView} 
            setActiveView={setActiveView}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
          />
        )}

        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 p-6">
            {renderActiveView()}
          </div>
          <footer className="bg-gray-200 text-center py-4 text-gray-700 text-sm">
            &copy; {new Date().getFullYear()} YourTutor. All rights reserved.<br />
            Contact: +256705251258 / +256780513947 | Email: timmehta71@gmail.com
          </footer>
        </div>
      </div>
    </div>
  );
};

  // Main App Component
  // 5. FIND your main App component and REPLACE it with this:
// Updated App Component
const App = () => {
  const { user, loading } = useAuth();
  
  // Check if this is a password reset URL - check both search params and hash
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isPasswordReset = urlParams.has('token') || hashParams.has('token');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle password reset URLs
  if (isPasswordReset) {
    return <PasswordResetHandler />;
  }

  return user ? <Layout /> : <LoginForm />;
};

// Root App with Auth Provider
export default function QuizApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}