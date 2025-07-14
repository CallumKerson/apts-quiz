/**
 * APTS Quiz JavaScript Implementation
 * Handles all client-side functionality for the quiz
 */

// Import PDF generation libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Global state management
const QuizState = {
  currentPage: 0,
  responses: {},
  startTime: null,
  endTime: null,

  // Save state to localStorage
  save() {
    localStorage.setItem(
      'apts_quiz_state',
      JSON.stringify({
        currentPage: this.currentPage,
        responses: this.responses,
        startTime: this.startTime,
      })
    );
  },

  // Load state from localStorage
  load() {
    const saved = localStorage.getItem('apts_quiz_state');
    if (saved) {
      const data = JSON.parse(saved);
      this.currentPage = data.currentPage || 0;
      this.responses = data.responses || {};
      this.startTime = data.startTime || null;
    }
  },

  // Clear all state
  reset() {
    this.currentPage = 0;
    this.responses = {};
    this.startTime = null;
    this.endTime = null;
    localStorage.removeItem('apts_quiz_state');
  },
};

// DOM elements cache
const DOM = {
  welcomeScreen: null,
  quizContainer: null,
  resultsContainer: null,
  questionPages: null,
  progressBar: null,
  currentPageSpan: null,
  totalPagesSpan: null,
  prevBtn: null,
  nextBtn: null,
  submitBtn: null,
  startQuizBtn: null,
  restartBtn: null,
  retakeQuizBtn: null,
  downloadResultsBtn: null,

  // Initialize DOM references
  init() {
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.quizContainer = document.getElementById('quiz-container');
    this.resultsContainer = document.getElementById('results-container');
    this.questionPages = document.getElementById('question-pages');
    this.progressBar = document.getElementById('progress-bar');
    this.currentPageSpan = document.getElementById('current-page');
    this.totalPagesSpan = document.getElementById('total-pages');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.submitBtn = document.getElementById('submit-btn');
    this.startQuizBtn = document.getElementById('start-quiz-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.retakeQuizBtn = document.getElementById('retake-quiz-btn');
    this.downloadResultsBtn = document.getElementById('download-results-btn');
  },
};

// Quiz Controller
const QuizController = {
  // Initialize the quiz
  init() {
    DOM.init();
    QuizState.load();
    this.setupEventListeners();
    this.renderQuizPages();

    // Show appropriate screen based on state
    if (QuizState.currentPage > 0) {
      this.showQuiz();
      this.showPage(QuizState.currentPage);
    }
  },

  // Set up all event listeners
  setupEventListeners() {
    // Navigation
    DOM.startQuizBtn?.addEventListener('click', () => this.startQuiz());
    DOM.prevBtn?.addEventListener('click', () => this.previousPage());
    DOM.nextBtn?.addEventListener('click', () => this.nextPage());
    DOM.submitBtn?.addEventListener('click', () => this.submitQuiz());

    // Restart options
    DOM.restartBtn?.addEventListener('click', () => this.restartQuiz());
    DOM.retakeQuizBtn?.addEventListener('click', () => this.restartQuiz());

    // Results
    DOM.downloadResultsBtn?.addEventListener('click', () => this.downloadResults());

    // Handle browser back button
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page !== undefined) {
        this.showPage(e.state.page, false);
      }
    });
  },

  // Render all quiz pages from config
  renderQuizPages() {
    if (!APTS_CONFIG || !APTS_CONFIG.pages) return;

    DOM.questionPages.innerHTML = '';
    DOM.totalPagesSpan.textContent = APTS_CONFIG.pages.length;

    APTS_CONFIG.pages.forEach((page) => {
      const pageEl = this.createQuizPage(page);
      DOM.questionPages.appendChild(pageEl);
    });
  },

  // Create a quiz page element
  createQuizPage(pageData) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'question-page hidden';
    pageDiv.dataset.page = pageData.page_number;
    pageDiv.dataset.subscale = pageData.subscale_key;

    // Get subscale info
    const subscale = APTS_CONFIG.subscales[pageData.subscale_key];

    // Add heading
    pageDiv.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-2">${subscale.name}</h2>
            <p class="text-gray-600 mb-8">${subscale.description}</p>
            <div class="space-y-8"></div>
        `;

    // Add questions
    const questionsContainer = pageDiv.querySelector('.space-y-8');
    pageData.questions.forEach((question, index) => {
      const questionEl = this.createQuestion(question);
      questionEl.style.animationDelay = `${index * 0.1}s`;
      questionsContainer.appendChild(questionEl);
    });

    return pageDiv;
  },

  // Create a question element
  createQuestion(question) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item bg-gray-50 rounded-lg p-6';
    questionDiv.dataset.questionId = question.id;

    questionDiv.innerHTML = `
            <p class="text-lg font-medium text-gray-800 mb-4">${question.text}</p>
            <div class="likert-scale grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"></div>
        `;

    // Add Likert scale options
    const scaleContainer = questionDiv.querySelector('.likert-scale');
    APTS_CONFIG.likertScale.forEach((option) => {
      const optionEl = this.createLikertOption(question.id, option);
      scaleContainer.appendChild(optionEl);
    });

    // Restore saved response if exists
    if (QuizState.responses[question.id]) {
      const savedInput = questionDiv.querySelector(
        `input[value="${QuizState.responses[question.id]}"]`
      );
      if (savedInput) savedInput.checked = true;
    }

    return questionDiv;
  },

  // Create a Likert scale option
  createLikertOption(questionId, option) {
    const label = document.createElement('label');
    label.className = 'likert-option relative cursor-pointer';

    label.innerHTML = `
            <input type="radio" 
                   name="question_${questionId}" 
                   value="${option.value}" 
                   class="sr-only peer"
                   data-question-id="${questionId}">
            <div class="border-2 border-gray-300 rounded-lg p-3 text-center transition-all 
                        peer-checked:border-purple-600 peer-checked:bg-purple-50 
                        hover:border-purple-400">
                <div class="font-semibold text-lg mb-1">${option.value}</div>
                <div class="text-xs text-gray-600">${option.label}</div>
            </div>
        `;

    // Add change listener
    const input = label.querySelector('input');
    input.addEventListener('change', (e) => this.handleResponse(e));

    return label;
  },

  // Handle response selection
  handleResponse(event) {
    const questionId = parseInt(event.target.dataset.questionId);
    const value = parseInt(event.target.value);

    QuizState.responses[questionId] = value;
    QuizState.save();

    // Check if current page is complete
    this.updateNavigationState();
  },

  // Start the quiz
  startQuiz() {
    QuizState.startTime = Date.now();
    QuizState.currentPage = 1;
    QuizState.save();

    this.showQuiz();
    this.showPage(1);

    // Show restart button
    DOM.restartBtn.classList.remove('hidden');
  },

  // Show quiz container
  showQuiz() {
    DOM.welcomeScreen.classList.add('hidden');
    DOM.resultsContainer.classList.add('hidden');
    DOM.quizContainer.classList.remove('hidden');
  },

  // Show specific page
  showPage(pageNumber, updateHistory = true) {
    // Hide all pages
    document.querySelectorAll('.question-page').forEach((page) => {
      page.classList.add('hidden');
    });

    // Show target page
    const targetPage = document.querySelector(`[data-page="${pageNumber}"]`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      targetPage.classList.add('fade-in');
    }

    // Update state
    QuizState.currentPage = pageNumber;
    QuizState.save();

    // Update UI
    this.updateProgressBar();
    this.updateNavigationState();

    // Update browser history
    if (updateHistory) {
      history.pushState({ page: pageNumber }, '', `#page-${pageNumber}`);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Update progress bar
  updateProgressBar() {
    const progress = (QuizState.currentPage / APTS_CONFIG.pages.length) * 100;
    DOM.progressBar.style.width = `${progress}%`;
    DOM.currentPageSpan.textContent = QuizState.currentPage;
  },

  // Update navigation button states
  updateNavigationState() {
    const currentPageData = APTS_CONFIG.pages[QuizState.currentPage - 1];
    const isComplete = this.isPageComplete(currentPageData);
    const isFirstPage = QuizState.currentPage === 1;
    const isLastPage = QuizState.currentPage === APTS_CONFIG.pages.length;

    // Previous button
    DOM.prevBtn.disabled = isFirstPage;
    DOM.prevBtn.classList.toggle('hidden', false);

    // Next button
    DOM.nextBtn.disabled = !isComplete;
    DOM.nextBtn.classList.toggle('hidden', isLastPage);

    // Submit button
    DOM.submitBtn.classList.toggle('hidden', !isLastPage);
    DOM.submitBtn.disabled = !isComplete;
  },

  // Check if current page is complete
  isPageComplete(pageData) {
    if (!pageData) return false;

    return pageData.questions.every((q) => QuizState.responses[q.id] !== undefined);
  },

  // Navigate to previous page
  previousPage() {
    if (QuizState.currentPage > 1) {
      this.showPage(QuizState.currentPage - 1);
    }
  },

  // Navigate to next page
  nextPage() {
    if (QuizState.currentPage < APTS_CONFIG.pages.length) {
      this.showPage(QuizState.currentPage + 1);
    }
  },

  // Submit quiz and calculate results
  submitQuiz() {
    QuizState.endTime = Date.now();

    // Calculate scores
    const scores = ScoreCalculator.calculateAllScores(QuizState.responses);

    // Show results
    this.showResults(scores);
  },

  // Show results screen
  showResults(scores) {
    DOM.quizContainer.classList.add('hidden');
    DOM.resultsContainer.classList.remove('hidden');

    // Render results
    ResultsRenderer.render(scores);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Restart quiz
  restartQuiz() {
    if (confirm('Are you sure you want to start over? Your current progress will be lost.')) {
      QuizState.reset();
      location.reload();
    }
  },

  // Download results
  async downloadResults() {
    const scores = ScoreCalculator.calculateAllScores(QuizState.responses);
    await PDFGenerator.generatePDF(scores);
  },
};

// Score Calculator
const ScoreCalculator = {
  // Calculate all scores
  calculateAllScores(responses) {
    const subscaleScores = this.calculateSubscaleScores(responses);
    const compositeScores = this.calculateCompositeScores(subscaleScores);

    return {
      subscales: subscaleScores,
      composites: compositeScores,
      responses: responses,
      completionTime: this.calculateCompletionTime(),
    };
  },

  // Calculate subscale scores
  calculateSubscaleScores(responses) {
    const scores = {};

    Object.entries(APTS_CONFIG.subscales).forEach(([key, subscale]) => {
      const subscaleResponses = subscale.questions
        .map((qId) => responses[qId])
        .filter((r) => r !== undefined);

      scores[key] = {
        name: subscale.name,
        description: subscale.description,
        score: this.calculateAverage(subscaleResponses),
        responses: subscaleResponses,
        maxScore: 6,
      };
    });

    return scores;
  },

  // Calculate composite scores
  calculateCompositeScores(subscaleScores) {
    const scores = {};

    // Fun-seeking Motivation
    const funSeekingComponents = ['fun_belief', 'initiative', 'reactivity'];
    const funSeekingScores = funSeekingComponents
      .map((key) => subscaleScores[key].score)
      .filter((s) => s > 0);

    scores.fun_seeking_motivation = {
      name: APTS_CONFIG.compositeScores.fun_seeking_motivation.name,
      description: APTS_CONFIG.compositeScores.fun_seeking_motivation.description,
      score: this.calculateAverage(funSeekingScores),
      components: funSeekingComponents,
    };

    // Overall Playfulness
    const playfulnessComponents = [
      scores.fun_seeking_motivation.score,
      subscaleScores.uninhibitedness.score,
      subscaleScores.spontaneity.score,
    ].filter((s) => s > 0);

    scores.playfulness = {
      name: APTS_CONFIG.compositeScores.playfulness.name,
      description: APTS_CONFIG.compositeScores.playfulness.description,
      score: this.calculateAverage(playfulnessComponents),
      components: ['fun_seeking_motivation', 'uninhibitedness', 'spontaneity'],
    };

    return scores;
  },

  // Calculate average
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100; // Round to 2 decimal places
  },

  // Calculate completion time
  calculateCompletionTime() {
    if (!QuizState.startTime || !QuizState.endTime) return null;

    const duration = QuizState.endTime - QuizState.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return {
      totalMs: duration,
      minutes: minutes,
      seconds: seconds,
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    };
  },
};

// Results Renderer
const ResultsRenderer = {
  // Render all results
  render(scores) {
    // Update overall score
    document.getElementById('overall-score').textContent =
      scores.composites.playfulness.score.toFixed(2);

    // Render subscale scores
    this.renderSubscaleScores(scores.subscales);

    // Render composite scores
    this.renderCompositeScores(scores.composites);

    // Render pentagon chart
    this.renderPentagonChart(scores.subscales);
  },

  // Render subscale score cards
  renderSubscaleScores(subscales) {
    const container = document.getElementById('subscale-scores');
    container.innerHTML = '';

    Object.entries(subscales).forEach(([, data]) => {
      const card = this.createScoreCard(data);
      container.appendChild(card);
    });
  },

  // Create score card element
  createScoreCard(data) {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 fade-in';

    const percentage = (data.score / data.maxScore) * 100;

    card.innerHTML = `
            <h4 class="font-semibold text-gray-800 mb-1">${data.name}</h4>
            <p class="text-sm text-gray-600 mb-2">${data.description}</p>
            <div class="flex items-baseline">
                <span class="text-2xl font-bold text-purple-600">${data.score.toFixed(2)}</span>
                <span class="text-gray-500 ml-1">/ 6.00</span>
            </div>
            <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                     style="width: 0%"
                     data-target-width="${percentage}">
                </div>
            </div>
        `;

    // Animate progress bar after insertion
    setTimeout(() => {
      const progressBar = card.querySelector('[data-target-width]');
      progressBar.style.width = progressBar.dataset.targetWidth + '%';
    }, 100);

    return card;
  },

  // Render composite scores
  renderCompositeScores(composites) {
    const container = document.getElementById('composite-scores');
    container.innerHTML = '';

    // Add Fun-seeking Motivation
    if (composites.fun_seeking_motivation) {
      container.appendChild(this.createCompositeScoreElement(composites.fun_seeking_motivation));
    }

    // Add Overall Playfulness (already shown as main score)
    // Skip to avoid duplication
  },

  // Create composite score element
  createCompositeScoreElement(data) {
    const element = document.createElement('div');
    element.className = 'bg-purple-50 rounded-lg p-4 border border-purple-200 fade-in';

    element.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-semibold text-purple-900">${data.name}</h4>
                    <p class="text-sm text-purple-700">${data.description}</p>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-bold text-purple-600">${data.score.toFixed(2)}</span>
                    <span class="text-purple-500">/ 6.00</span>
                </div>
            </div>
        `;

    return element;
  },

  // Render pentagon chart
  renderPentagonChart(subscales) {
    const ctx = document.getElementById('pentagon-chart').getContext('2d');

    // Prepare data for radar chart
    const labels = [];
    const data = [];
    const maxValue = 6;

    // Order for pentagon display
    const subscaleOrder = [
      'fun_belief',
      'initiative',
      'reactivity',
      'uninhibitedness',
      'spontaneity',
    ];

    subscaleOrder.forEach((key) => {
      if (subscales[key]) {
        labels.push(subscales[key].name);
        // Normalize to percentage for better visualization
        data.push((subscales[key].score / maxValue) * 100);
      }
    });

    // Create radar chart
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Your Scores',
            data: data,
            backgroundColor: 'rgba(147, 51, 234, 0.2)',
            borderColor: 'rgba(147, 51, 234, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(147, 51, 234, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              callback: function (value) {
                return value + '%';
              },
            },
            pointLabels: {
              font: {
                size: 14,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const actualScore = (context.parsed.r / 100) * maxValue;
                return `${context.dataset.label}: ${actualScore.toFixed(2)} / 6.00`;
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
      },
    });
  },
};

// PDF Generation functionality
const PDFGenerator = {
  async generatePDF(scores) {
    try {
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(147, 51, 234);
      pdf.text('APTS Quiz Results', pageWidth / 2, 25, { align: 'center' });

      // Add subtitle
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Adult Playfulness Trait Scale Assessment', pageWidth / 2, 35, { align: 'center' });

      // Add overall score
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Overall Playfulness Score', 20, 55);
      pdf.setFontSize(24);
      pdf.setTextColor(147, 51, 234);
      pdf.text(`${scores.composites.playfulness.score.toFixed(2)} / 6.00`, 20, 70);

      // Capture pentagon chart
      const pentagonCanvas = document.getElementById('pentagon-chart');
      if (pentagonCanvas) {
        const chartImage = await html2canvas(pentagonCanvas, {
          backgroundColor: '#f9fafb',
          scale: 2,
        });

        // Add chart to PDF
        const chartDataURL = chartImage.toDataURL('image/png');
        const chartWidth = 80;
        const chartHeight = (chartImage.height / chartImage.width) * chartWidth;
        pdf.addImage(
          chartDataURL,
          'PNG',
          (pageWidth - chartWidth) / 2,
          85,
          chartWidth,
          chartHeight
        );
      }

      // Add subscale scores
      let yPos = 180;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Detailed Subscale Scores', 20, yPos);
      yPos += 15;

      Object.entries(scores.subscales).forEach(([_key, data]) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(data.name, 20, yPos);
        pdf.setTextColor(147, 51, 234);
        pdf.text(`${data.score.toFixed(2)} / 6.00`, pageWidth - 30, yPos, { align: 'right' });

        yPos += 8;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const description = pdf.splitTextToSize(data.description, pageWidth - 40);
        pdf.text(description, 20, yPos);
        yPos += description.length * 4 + 8;
      });

      // Add composite scores
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 20;
      }

      yPos += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Composite Scores', 20, yPos);
      yPos += 15;

      Object.entries(scores.composites).forEach(([_key, data]) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(data.name, 20, yPos);
        pdf.setTextColor(147, 51, 234);
        pdf.text(`${data.score.toFixed(2)} / 6.00`, pageWidth - 30, yPos, { align: 'right' });

        yPos += 8;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const description = pdf.splitTextToSize(data.description, pageWidth - 40);
        pdf.text(description, 20, yPos);
        yPos += description.length * 4 + 8;
      });

      // Add questions and answers section
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 20;
      }

      yPos += 15;
      pdf.setFontSize(16);
      pdf.setTextColor(147, 51, 234);
      pdf.text('Questions and Answers', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Group questions by subscale
      Object.entries(APTS_CONFIG.subscales).forEach(([_subscaleKey, subscale]) => {
        if (yPos > pageHeight - 50) {
          pdf.addPage();
          yPos = 20;
        }

        // Subscale header
        pdf.setFontSize(14);
        pdf.setTextColor(147, 51, 234);
        pdf.text(subscale.name, 20, yPos);
        yPos += 12;

        // Questions for this subscale
        subscale.questions.forEach((questionId) => {
          const question = APTS_CONFIG.questions[questionId];
          const response = scores.responses[questionId];

          if (!question || response === undefined) return;

          if (yPos > pageHeight - 25) {
            pdf.addPage();
            yPos = 20;
          }

          // Question text
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          const questionText = pdf.splitTextToSize(
            `Q${questionId}: ${question.text}`,
            pageWidth - 40
          );
          pdf.text(questionText, 20, yPos);
          yPos += questionText.length * 4 + 3;

          // Answer
          pdf.setTextColor(147, 51, 234);
          const answerLabel = APTS_CONFIG.likertScale[response - 1]?.label || `Score: ${response}`;
          pdf.text(`Answer: ${response} - ${answerLabel}`, 25, yPos);
          yPos += 8;
        });

        yPos += 5;
      });

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Generated by APTS Quiz Application', pageWidth / 2, pageHeight - 10, {
        align: 'center',
      });
      pdf.text(new Date().toLocaleDateString(), pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Save PDF
      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`APTS-Results-${timestamp}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.alert('Error generating PDF. Please try again.');
    }
  },
};

// Initialize quiz when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  QuizController.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    QuizState.save();
  }
});

// Warn before leaving if quiz in progress
window.addEventListener('beforeunload', (e) => {
  if (QuizState.currentPage > 0 && !DOM.resultsContainer.classList.contains('hidden')) {
    return; // Don't warn if viewing results
  }

  if (QuizState.currentPage > 0) {
    e.preventDefault();
    return '';
  }
});
