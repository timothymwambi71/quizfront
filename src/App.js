import React, { useState, useEffect, useReducer } from 'react';
import { Clock, Home, BookOpen, CheckCircle, XCircle, RotateCcw, Play, Pause, Loader } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'https://quizbackend-tjvb.onrender.com/api';

// API Service
const apiService = {
  async fetchSubjects() {
    const response = await fetch(`${API_BASE_URL}/subjects/`);
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return response.json();
  },

  async fetchSubject(slug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${slug}/`);
    if (!response.ok) throw new Error('Failed to fetch subject');
    return response.json();
  },

  async fetchTopic(subjectSlug, topicSlug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectSlug}/topics/${topicSlug}/`);
    if (!response.ok) throw new Error('Failed to fetch topic');
    return response.json();
  },

  async fetchSubtopic(subjectSlug, topicSlug, subtopicSlug) {
    const response = await fetch(`${API_BASE_URL}/subjects/${subjectSlug}/topics/${topicSlug}/subtopics/${subtopicSlug}/`);
    if (!response.ok) throw new Error('Failed to fetch subtopic');
    return response.json();
  },

  async submitQuiz(subtopicId, answers, timeTaken) {
    const response = await fetch(`${API_BASE_URL}/submit-quiz/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subtopic_id: subtopicId,
        answers: answers,
        time_taken: timeTaken
      })
    });
    if (!response.ok) throw new Error('Failed to submit quiz');
    return response.json();
  },

  async getQuizResults(attemptId) {
    const response = await fetch(`${API_BASE_URL}/quiz-results/${attemptId}/`);
    if (!response.ok) throw new Error('Failed to fetch quiz results');
    return response.json();
  }
};

// Redux-like state management with useReducer
const initialState = {
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
  quizStartTime: null
};

const quizReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_SUBJECTS':
      return { ...state, subjects: action.payload, loading: false };
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
        quizStartTime: Date.now()
      };
    case 'ANSWER_QUESTION':
      const newAnswers = [...state.answers];
      newAnswers[state.currentQuestionIndex] = action.payload;
      return { ...state, answers: newAnswers };
    case 'NEXT_QUESTION':
      return { ...state, currentQuestionIndex: state.currentQuestionIndex + 1 };
    case 'PREVIOUS_QUESTION':
      return { ...state, currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) };
    case 'FINISH_QUIZ':
      return { 
        ...state, 
        isQuizActive: false,
        isTimerRunning: false,
        showResults: true,
        score: action.payload.score,
        quizAttemptId: action.payload.quizAttemptId
      };
    case 'SET_QUIZ_RESULTS':
      return { ...state, quizResults: action.payload, loading: false };
    case 'TICK_TIMER':
      const newTime = state.timeRemaining - 1;
      return { ...state, timeRemaining: Math.max(0, newTime) };
    case 'TOGGLE_TIMER':
      return { ...state, isTimerRunning: !state.isTimerRunning };
    case 'RESET_QUIZ':
      return { 
        ...state, 
        currentQuiz: null,
        currentQuestionIndex: 0,
        answers: [],
        score: 0,
        isQuizActive: false,
        timeRemaining: 600,
        isTimerRunning: false,
        showResults: false,
        quizAttemptId: null,
        quizResults: null,
        quizStartTime: null
      };
    case 'GO_HOME':
      return { 
        ...initialState,
        subjects: state.subjects
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

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
    <p className="mb-2">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

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

// Navigation Breadcrumb
const Breadcrumb = ({ state, dispatch }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <button 
        onClick={() => dispatch({ type: 'GO_HOME' })}
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="w-4 h-4 mr-1" />
        Home
      </button>
      {state.currentSubject && (
        <>
          <span>/</span>
          <button 
            onClick={() => dispatch({ type: 'SET_SUBJECT', payload: state.currentSubject })}
            className="hover:text-blue-600 transition-colors"
          >
            {state.currentSubject.name}
          </button>
        </>
      )}
      {state.currentTopic && (
        <>
          <span>/</span>
          <button 
            onClick={() => dispatch({ type: 'SET_TOPIC', payload: state.currentTopic })}
            className="hover:text-blue-600 transition-colors"
          >
            {state.currentTopic.name}
          </button>
        </>
      )}
      {state.currentSubtopic && (
        <>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {state.currentSubtopic.name}
          </span>
        </>
      )}
    </nav>
  );
};

// Subject Selection Component
const SubjectSelection = ({ subjects, loading, error, dispatch, onRetry }) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">A-Level Sciences Mastery</h1>
      <p className="text-gray-600 mb-12">Choose your subject to begin</p>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => dispatch({ type: 'SET_SUBJECT', payload: subject })}
            className={`${subject.color} text-white p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
          >
            <BookOpen className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">{subject.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

// Topic Selection Component
const TopicSelection = ({ subject, dispatch }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{subject.name} Topics</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {subject.topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => dispatch({ type: 'SET_TOPIC', payload: topic })}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg border-l-4 border-blue-500 transition-all duration-200 text-left"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{topic.name}</h3>
            <p className="text-gray-600">{topic.subtopics.length} subtopic(s)</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Subtopic Selection Component
const SubtopicSelection = ({ topic, dispatch }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">{topic.name} - Subtopics</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {topic.subtopics.map((subtopic) => (
          <div key={subtopic.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{subtopic.name}</h3>
            <p className="text-gray-600 mb-4">{subtopic.question_count} questions</p>
            <button
              onClick={() => {
                dispatch({ type: 'SET_SUBTOPIC', payload: subtopic });
                dispatch({ 
                  type: 'START_QUIZ', 
                  payload: { 
                    quiz: subtopic, 
                    duration: 300 // 5 minutes per quiz
                  } 
                });
              }}
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

// Quiz Component
const Quiz = ({ state, dispatch }) => {
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
        state.currentSubtopic.id,
        state.answers,
        timeTaken
      );
      
      dispatch({ 
        type: 'FINISH_QUIZ', 
        payload: { 
          score: result.score,
          quizAttemptId: result.quiz_attempt_id
        } 
      });

      // Fetch detailed results
      const detailedResults = await apiService.getQuizResults(result.quiz_attempt_id);
      dispatch({ type: 'SET_QUIZ_RESULTS', payload: detailedResults });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
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

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Question */}
      <div className="bg-white p-8 rounded-lg shadow-lg mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
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

      {/* Navigation Buttons */}
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

        {/* Question Review */}
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
                    Your answer: {result.user_answer !== null ? result.options[result.user_answer] : 'Not answered'}
                    {result.is_correct ? ' ✓' : ' ✗'}
                  </p>
                  {!result.is_correct && (
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
      </div>

      <div className="flex space-x-4 justify-center">
        <button
          onClick={() => dispatch({ type: 'RESET_QUIZ' })}
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

  // Load subjects on app start
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const subjects = await apiService.fetchSubjects();
        dispatch({ type: 'SET_SUBJECTS', payload: subjects });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    };

    loadSubjects();
  }, []);

  // Timer effect
  useEffect(() => {
    let timer;
    if (state.isTimerRunning && state.timeRemaining > 0) {
      timer = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    } else if (state.timeRemaining === 0 && state.isQuizActive) {
      // Auto-submit when timer reaches 0
      handleAutoSubmit();
    }
    return () => clearInterval(timer);
  }, [state.isTimerRunning, state.timeRemaining, state.isQuizActive]);

  const handleAutoSubmit = async () => {
    try {
      const timeTaken = Math.floor((Date.now() - state.quizStartTime) / 1000);
      
      const result = await apiService.submitQuiz(
        state.currentSubtopic.id,
        state.answers,
        timeTaken
      );
      
      dispatch({ 
        type: 'FINISH_QUIZ', 
        payload: { 
          score: result.score,
          quizAttemptId: result.quiz_attempt_id
        } 
      });

      const detailedResults = await apiService.getQuizResults(result.quiz_attempt_id);
      dispatch({ type: 'SET_QUIZ_RESULTS', payload: detailedResults });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Load subject details when subject changes
  useEffect(() => {
    if (state.currentSubject && !state.currentSubject.topics) {
      const loadSubjectDetails = async () => {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const subjectDetails = await apiService.fetchSubject(state.currentSubject.slug);
          dispatch({ type: 'SET_SUBJECT', payload: subjectDetails });
        } catch (error) {
          dispatch({ type: 'SET_ERROR', payload: error.message });
        }
      };

      loadSubjectDetails();
    }
  }, [state.currentSubject]);

  // Load topic details when topic changes
  useEffect(() => {
    if (state.currentTopic && state.currentSubject && !state.currentTopic.subtopics) {
      const loadTopicDetails = async () => {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const topicDetails = await apiService.fetchTopic(
            state.currentSubject.slug, 
            state.currentTopic.slug
          );
          dispatch({ type: 'SET_TOPIC', payload: topicDetails });
        } catch (error) {
          dispatch({ type: 'SET_ERROR', payload: error.message });
        }
      };

      loadTopicDetails();
    }
  }, [state.currentTopic, state.currentSubject]);

  const retryLoadSubjects = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const subjects = await apiService.fetchSubjects();
      dispatch({ type: 'SET_SUBJECTS', payload: subjects });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const renderContent = () => {
    if (state.showResults) {
      return <Results state={state} dispatch={dispatch} />;
    }
    
    if (state.isQuizActive && state.currentQuiz) {
      return <Quiz state={state} dispatch={dispatch} />;
    }
    
    if (state.currentSubject && state.currentTopic) {
      if (state.loading) return <LoadingSpinner />;
      return <SubtopicSelection topic={state.currentTopic} dispatch={dispatch} />;
    }
    
    if (state.currentSubject) {
      if (state.loading) return <LoadingSpinner />;
      return <TopicSelection subject={state.currentSubject} dispatch={dispatch} />;
    }
    
    return (
      <SubjectSelection 
        subjects={state.subjects} 
        loading={state.loading} 
        error={state.error}
        dispatch={dispatch} 
        onRetry={retryLoadSubjects}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb state={state} dispatch={dispatch} />
        {state.error && !state.loading && (
          <ErrorMessage message={state.error} />
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default App;