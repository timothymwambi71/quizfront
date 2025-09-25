import React, { useState, useEffect, useReducer } from 'react';
import { Clock, Home, BookOpen, CheckCircle, XCircle, RotateCcw, Play, Pause, Loader, User, LogOut, Phone } from 'lucide-react';

// API Configuration
// const API_BASE_URL = 'https://quizbackend-tjvb.onrender.com/api';
const API_BASE_URL = 'http://localhost:8000/api';

// Enhanced API Service with authentication
const apiService = {
  // Authentication methods
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  async logout(token) {
    const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async getProfile(token) {
    const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  },

  // Payment methods
  async initiatePayment(token, paymentData) {
    const response = await fetch(`${API_BASE_URL}/payments/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    return response.json();
  },

  async checkPaymentStatus(token, paymentId) {
    const response = await fetch(`${API_BASE_URL}/payments/status/${paymentId}/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  },

  async getUserSubscriptions(token) {
    const response = await fetch(`${API_BASE_URL}/subscriptions/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  },

  async checkSubjectAccess(token, subjectSlug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectSlug}/access/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  },

  // Enhanced existing methods with authentication
  async fetchSubjects(token = null) {
    const headers = token ? { 'Authorization': `Token ${token}` } : {};
    const response = await fetch(`${API_BASE_URL}/subjects/`, { headers });
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return response.json();
  },

  async fetchSubject(token, slug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${slug}/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch subject');
    return response.json();
  },

  async fetchTopic(token, subjectSlug, topicSlug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectSlug}/topics/${topicSlug}/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch topic');
    return response.json();
  },

  async fetchSubtopic(token, subjectSlug, topicSlug, subtopicSlug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectSlug}/topics/${topicSlug}/subtopics/${subtopicSlug}/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  },

  async submitQuiz(token, subtopicId, answers, timeTaken) {
    const response = await fetch(`${API_BASE_URL}/quiz/submit/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subtopic_id: subtopicId,
        answers: answers,
        time_taken: timeTaken
      })
    });
    return response.json();
  },

  async getQuizResults(token, attemptId) {
    const response = await fetch(`${API_BASE_URL}/quiz/results/${attemptId}/`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  }
};

// Enhanced state management
const initialState = {
  // Authentication state
  user: null,
  token: null,
  isAuthenticated: false,
  
  // App state
  subjects: [],
  currentSubject: null,
  currentTopic: null,
  currentSubtopic: null,
  currentQuiz: null,
  currentQuestionIndex: 0,
  answers: [],
  score: 0,
  isQuizActive: false,
  timeRemaining: 600,
  isTimerRunning: false,
  showResults: false,
  loading: false,
  error: null,
  quizAttemptId: null,
  quizResults: null,
  quizStartTime: null,
  
  // UI state
  currentView: 'home',
  
  // Payment state
  paymentData: null,
  paymentStatus: null,
  subscriptions: []
};

const quizReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload.user, 
        token: action.payload.token,
        isAuthenticated: true,
        currentView: 'home',
        error: null 
      };
    case 'LOGOUT':
      return { 
        ...initialState
      };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SUBJECTS':
      return { ...state, subjects: action.payload, loading: false };
    case 'SET_PAYMENT_DATA':
      return { ...state, paymentData: action.payload, currentView: 'payment' };
    case 'SET_PAYMENT_STATUS':
      return { ...state, paymentStatus: action.payload };
    case 'SET_SUBSCRIPTIONS':
      return { ...state, subscriptions: action.payload };
    case 'SET_SUBJECT':
      return { ...state, currentSubject: action.payload, currentTopic: null, currentSubtopic: null };
    case 'SET_TOPIC':
      return { ...state, currentTopic: action.payload, currentSubtopic: null };
    case 'SET_SUBTOPIC':
      return { ...state, currentSubtopic: action.payload };
    case 'START_QUIZ':
      return { 
        ...state, 
        currentQuiz: action.payload.quiz, 
        isQuizActive: true, 
        currentQuestionIndex: 0,
        answers: [],
        score: 0,
        timeRemaining: action.payload.duration,
        isTimerRunning: true,
        showResults: false,
        quizStartTime: Date.now(),
        currentView: 'quiz'
      };
    case 'FINISH_QUIZ':
      return { 
        ...state, 
        isQuizActive: false,
        isTimerRunning: false,
        showResults: true,
        score: action.payload.score,
        quizAttemptId: action.payload.quizAttemptId,
        currentView: 'results'
      };
    case 'SET_QUIZ_RESULTS':
      return { ...state, quizResults: action.payload, loading: false };
    case 'ANSWER_QUESTION':
      const newAnswers = [...state.answers];
      newAnswers[state.currentQuestionIndex] = action.payload;
      return { ...state, answers: newAnswers };
    case 'NEXT_QUESTION':
      return { ...state, currentQuestionIndex: state.currentQuestionIndex + 1 };
    case 'PREVIOUS_QUESTION':
      return { ...state, currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) };
    case 'TICK_TIMER':
      const newTime = state.timeRemaining - 1;
      return { ...state, timeRemaining: Math.max(0, newTime) };
    case 'TOGGLE_TIMER':
      return { ...state, isTimerRunning: !state.isTimerRunning };
    case 'GO_HOME':
      return { 
        ...state,
        currentSubject: null,
        currentTopic: null,
        currentSubtopic: null,
        currentQuiz: null,
        isQuizActive: false,
        showResults: false,
        currentView: 'home'
      };
    default:
      return state;
  }
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <Loader className="w-8 h-8 animate-spin text-blue-500" />
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Authentication Components
const LoginForm = ({ state, dispatch }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiService.login(formData);
      if (response.success) {
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { 
            token: response.token,
            user: { 
              id: response.user_id,
              username: response.username 
            }
          }
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid credentials' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed. Please try again.' });
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Login to YourTutor</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="text-center mt-4">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <button 
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'register' })}
            className="text-blue-500 hover:underline"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

const RegisterForm = ({ state, dispatch }) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiService.register(formData);
      if (response.success) {
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { 
            token: response.token,
            user: { 
              id: response.user_id,
              username: response.username 
            }
          }
        });
      } else {
        const errorMessage = response.errors ? Object.values(response.errors).flat().join(', ') : 'Registration failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Registration failed. Please try again.' });
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Register for YourTutor</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none form:border-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
            placeholder="0700123456 or +256700123456"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            minLength="8"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={formData.password_confirm}
            onChange={(e) => setFormData({...formData, password_confirm: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="text-center mt-4">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button 
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'login' })}
            className="text-blue-500 hover:underline"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

// Payment Component
const PaymentForm = ({ state, dispatch }) => {
  const [paymentData, setPaymentData] = useState({
    payment_method: 'MTN',
    phone_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const subject = state.currentSubject;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiService.initiatePayment(state.token, {
        subject_id: subject.id,
        ...paymentData
      });
      
      if (response.success) {
        setPaymentInitiated(true);
        dispatch({ type: 'SET_PAYMENT_DATA', payload: response });
        
        // Start checking payment status
        checkPaymentStatus(response.payment_id);
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Payment initiation failed' });
    }
    
    setLoading(false);
  };

  const checkPaymentStatus = async (paymentId) => {
    try {
      const response = await apiService.checkPaymentStatus(state.token, paymentId);
      if (response.success) {
        dispatch({ type: 'SET_PAYMENT_STATUS', payload: response.status });
        
        if (response.status === 'COMPLETED') {
          // Refresh subscriptions and go back to subject
          const subscriptionsResponse = await apiService.getUserSubscriptions(state.token);
          if (subscriptionsResponse.success) {
            dispatch({ type: 'SET_SUBSCRIPTIONS', payload: subscriptionsResponse.subscriptions });
          }
          setTimeout(() => {
            dispatch({ type: 'SET_VIEW', payload: 'home' });
          }, 2000);
        } else if (response.status === 'PENDING') {
          // Check again in 5 seconds
          setTimeout(() => checkPaymentStatus(paymentId), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  if (paymentInitiated) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          {state.paymentStatus === 'COMPLETED' ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : state.paymentStatus === 'FAILED' ? (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          ) : (
            <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          )}
        </div>
        
        <h3 className="text-xl font-bold mb-4">
          {state.paymentStatus === 'COMPLETED' ? 'Payment Successful!' :
           state.paymentStatus === 'FAILED' ? 'Payment Failed' :
           'Processing Payment...'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {state.paymentStatus === 'COMPLETED' ? 
            'Your subscription is now active. You can access all quizzes!' :
           state.paymentStatus === 'FAILED' ? 
            'There was an issue with your payment. Please try again.' :
            `Please check your phone for a payment prompt from ${paymentData.payment_method}.`}
        </p>
        
        {state.paymentStatus !== 'COMPLETED' && (
          <button
            onClick={() => {
              setPaymentInitiated(false);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Subscribe to {subject?.name}</h2>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg">{subject?.name}</h3>
        <p className="text-2xl font-bold text-blue-600">UGX {subject?.price?.toLocaleString()}</p>
        <p className="text-sm text-gray-600">30 days access to all quizzes</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Payment Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="MTN"
                checked={paymentData.payment_method === 'MTN'}
                onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                className="mr-2"
              />
              <Phone className="w-5 h-5 mr-2 text-yellow-500" />
              MTN Mobile Money
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="AIRTEL"
                checked={paymentData.payment_method === 'AIRTEL'}
                onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                className="mr-2"
              />
              <Phone className="w-5 h-5 mr-2 text-red-500" />
              Airtel Money
            </label>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={paymentData.phone_number}
            onChange={(e) => setPaymentData({...paymentData, phone_number: e.target.value})}
            placeholder="0700123456"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Pay UGX ${subject?.price?.toLocaleString()}`}
        </button>
      </form>
      
      <div className="text-center mt-4">
        <button 
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'home' })}
          className="text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Header Component
const Header = ({ state, dispatch }) => {
  const handleLogout = async () => {
    try {
      if (state.token) {
        await apiService.logout(state.token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <button 
          onClick={() => dispatch({ type: 'GO_HOME' })}
          className="text-2xl font-bold text-blue-600"
        >
          YourTutor
        </button>
        
        {state.isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {state.user?.username}</span>
            <button
              onClick={handleLogout}
              className="flex items-center text-red-600 hover:text-red-700"
            >
              <LogOut className="w-5 h-5 mr-1" />
              Logout
            </button>
          </div>
        ) : (
          <div className="space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'login' })}
              className="text-blue-600 hover:text-blue-700"
            >
              Login
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'register' })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// Enhanced Subject Selection with subscription info
const SubjectSelection = ({ subjects, state, dispatch }) => {
  const handleSubjectClick = async (subject) => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'SET_VIEW', payload: 'login' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const accessResponse = await apiService.checkSubjectAccess(state.token, subject.slug);
      
      if (accessResponse.success && accessResponse.has_access) {
        // User has access, fetch full subject details with topics
        const subjectDetails = await apiService.fetchSubject(state.token, subject.slug);
        dispatch({ type: 'SET_SUBJECT', payload: subjectDetails });
        dispatch({ type: 'SET_VIEW', payload: 'topics' });
      } else {
        // Show payment form
        dispatch({ type: 'SET_SUBJECT', payload: subject });
        dispatch({ type: 'SET_VIEW', payload: 'payment' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to check access' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getSubjectStatus = (subject) => {
    const subscription = state.subscriptions.find(sub => sub.subject_name === subject.name);
    if (subscription && !subscription.is_expired) {
      return { hasAccess: true, daysLeft: subscription.days_remaining };
    }
    return { hasAccess: false };
  };

  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold text-blue-400 mb-2">Your Tutor</h2>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">A-Level Sciences Mastery</h1>
      <p className="text-gray-600 mb-12">Choose your subject to begin</p>
      
      {!state.isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-8 max-w-2xl mx-auto">
          <p className="font-medium">Please login or register to access quizzes</p>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {subjects.map((subject) => {
          const status = getSubjectStatus(subject);
          return (
            <div key={subject.id} className="relative">
              <button
                onClick={() => handleSubjectClick(subject)}
                className={`${subject.color} text-white p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full`}
              >
                <BookOpen className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">{subject.name}</h3>
                <p className="text-sm opacity-90">UGX {subject.price?.toLocaleString()}/month</p>
              </button>
              
              {(
                <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                  {status.daysLeft} days left
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Topic Selection Component
const TopicSelection = ({ subject, state, dispatch }) => {
  const handleTopicClick = async (topic) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const topicDetails = await apiService.fetchTopic(state.token, subject.slug, topic.slug);
      dispatch({ type: 'SET_TOPIC', payload: topicDetails });
      dispatch({ type: 'SET_VIEW', payload: 'subtopics' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load topic details' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{subject.name} Topics</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {subject.topics?.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicClick(topic)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg border-l-4 border-blue-500 transition-all duration-200 text-left"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{topic.name}</h3>
            <p className="text-gray-600">{topic.subtopics?.length || 0} subtopic(s)</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Subtopic Selection Component
const SubtopicSelection = ({ topic, state, dispatch }) => {
  const handleSubtopicClick = async (subtopic) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.fetchSubtopic(
        state.token, 
        state.currentSubject.slug, 
        topic.slug, 
        subtopic.slug
      );
      
      if (response.success) {
        dispatch({ type: 'SET_SUBTOPIC', payload: response.subtopic });
        dispatch({ 
          type: 'START_QUIZ', 
          payload: { 
            quiz: response.subtopic, 
            duration: 300 // 5 minutes per quiz
          } 
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load quiz content' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{topic.name} - Subtopics</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {topic.subtopics?.map((subtopic) => (
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
        ))}
      </div>
    </div>
  );
};

// Timer Component
const Timer = ({ timeRemaining, isRunning, onToggle }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 60) return 'text-red-500';
    if (timeRemaining <= 180) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2">
      <Clock className="w-5 h-5 text-gray-600" />
      <span className={`font-mono text-lg font-bold ${getTimerColor()}`}>
        {formatTime(timeRemaining)}
      </span>
      <button
        onClick={onToggle}
        className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
    </div>
  );
};

// Quiz Component
const Quiz = ({ state, dispatch }) => {
  if (!state.currentQuiz?.questions || state.currentQuiz.questions.length === 0) {
    return (
      <div className="text-center">
        <p className="text-gray-600">No questions available for this quiz.</p>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'subtopics' })}
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
            quizAttemptId: result.quiz_attempt_id
          } 
        });

        // Fetch detailed results
        const detailedResults = await apiService.getQuizResults(state.token, result.quiz_attempt_id);
        if (detailedResults.success) {
          dispatch({ type: 'SET_QUIZ_RESULTS', payload: detailedResults });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to submit quiz' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
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

// Results Component
const Results = ({ state, dispatch }) => {
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

  const formatTime = (seconds) => {
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
              <span className="text-2xl font-bold text-blue-600">{formatTime(time_taken)}</span>
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
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'subtopics' })}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Take Another Quiz
        </button>
        
        <button
          onClick={() => dispatch({ type: 'GO_HOME' })}
          className="flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  // Initialize authentication from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          token: token,
          user: { username: 'User' } // Will be updated when profile loads
        }
      });
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const subjects = await apiService.fetchSubjects(state.token);
        dispatch({ type: 'SET_SUBJECTS', payload: subjects });
        
        if (state.isAuthenticated && state.token) {
          try {
            const subscriptionsResponse = await apiService.getUserSubscriptions(state.token);
            if (subscriptionsResponse.success) {
              dispatch({ type: 'SET_SUBSCRIPTIONS', payload: subscriptionsResponse.subscriptions });
            }
          } catch (error) {
            console.error('Failed to load subscriptions:', error);
          }
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
  }, [state.isAuthenticated, state.token]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (state.isTimerRunning && state.timeRemaining > 0) {
      timer = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    } else if (state.timeRemaining === 0 && state.isQuizActive) {
      handleAutoSubmit();
    }
    return () => clearInterval(timer);
  }, [state.isTimerRunning, state.timeRemaining, state.isQuizActive]);

  const handleAutoSubmit = async () => {
    try {
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
            quizAttemptId: result.quiz_attempt_id
          } 
        });

        const detailedResults = await apiService.getQuizResults(state.token, result.quiz_attempt_id);
        if (detailedResults.success) {
          dispatch({ type: 'SET_QUIZ_RESULTS', payload: detailedResults });
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const renderContent = () => {
    if (state.loading) return <LoadingSpinner />;
    
    switch (state.currentView) {
      case 'login':
        return <LoginForm state={state} dispatch={dispatch} />;
      case 'register':
        return <RegisterForm state={state} dispatch={dispatch} />;
      case 'payment':
        return <PaymentForm state={state} dispatch={dispatch} />;
      case 'topics':
        return <TopicSelection subject={state.currentSubject} state={state} dispatch={dispatch} />;
      case 'subtopics':
        return <SubtopicSelection topic={state.currentTopic} state={state} dispatch={dispatch} />;
      case 'quiz':
        return <Quiz state={state} dispatch={dispatch} />;
      case 'results':
        return <Results state={state} dispatch={dispatch} />;
      default:
        return (
          <SubjectSelection 
            subjects={state.subjects} 
            state={state} 
            dispatch={dispatch} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header state={state} dispatch={dispatch} />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 max-w-2xl mx-auto">
            {state.error}
          </div>
        )}
        {renderContent()}
      </div>
      
      <footer className="bg-gray-200 text-center py-4 text-gray-700 text-sm">
        &copy; {new Date().getFullYear()} YourTutor. All rights reserved.<br />
        Contact: +256705251258 | Email: timmehta71@gmail.com
      </footer>
    </div>
  );
};

export default App;