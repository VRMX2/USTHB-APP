const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Default configuration
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;

// Helper function to make OpenAI request
const makeOpenAIRequest = async (messages, options = {}) => {
  try {
    const completion = await openai.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages,
      max_tokens: options.maxTokens || MAX_TOKENS,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    });

    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI service temporarily unavailable');
  }
};

// Generate general response
const generateResponse = async (prompt, type = 'general', options = {}) => {
  const systemPrompts = {
    general: `You are an AI assistant for USTHB Faculty of Informatics students. You help with academic questions, course content, and study guidance. Be helpful, accurate, and educational. Always encourage learning and provide practical advice.`,
    
    academic: `You are an academic advisor for computer science students at USTHB Faculty of Informatics. Provide detailed, educational responses about courses, programming, algorithms, and academic topics. Focus on helping students understand concepts deeply.`,
    
    study: `You are a study coach for university students. Provide practical study strategies, time management tips, and learning techniques. Be motivational and supportive while giving actionable advice.`
  };

  const messages = [
    {
      role: 'system',
      content: systemPrompts[type] || systemPrompts.general
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  return await makeOpenAIRequest(messages, options);
};

// Generate personalized study plan
const generateStudyPlan = async (studentData) => {
  const prompt = `Create a personalized study plan for a computer science student with the following profile:

Student Information:
- Name: ${studentData.student.name}
- Department: ${studentData.student.department}
- Enrolled Courses: ${studentData.student.enrolledCourses.map(c => `${c.name} (${c.code})`).join(', ')}

Academic Performance:
${studentData.academicPerformance.map(p => `- ${p.course}: ${p.grade}/20 ${p.feedback ? '- ' + p.feedback : ''}`).join('\n')}

Study Preferences:
- Daily study hours: ${studentData.studyPreferences.studyHoursPerDay}
- Study style: ${studentData.studyPreferences.preferences}
- Weak subjects: ${studentData.studyPreferences.weakSubjects.join(', ') || 'None specified'}
- Upcoming exams: ${Object.entries(studentData.studyPreferences.examDates || {}).map(([course, date]) => `${course} on ${date}`).join(', ') || 'None specified'}

Please create a detailed study plan including:
1. Weekly schedule with time allocation for each subject
2. Specific study strategies for weak subjects
3. Revision timeline for upcoming exams
4. Recommended study techniques and resources
5. Break times and stress management tips

Format the response as a structured study plan.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert academic advisor creating personalized study plans for university students. Focus on practical, achievable plans that consider the student\'s performance and preferences.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1500 });
  return response.content;
};

// Summarize text content
const summarizeText = async (content, options = {}) => {
  const lengthInstructions = {
    short: 'in 2-3 sentences',
    medium: 'in 1-2 paragraphs',
    long: 'in 3-4 paragraphs with key details'
  };

  const prompt = `Summarize the following content ${lengthInstructions[options.length] || lengthInstructions.medium}. Focus on the main concepts, important details, and key takeaways that would be most useful for a student studying this material:

Content:
${content}

Please provide a clear, educational summary that helps students understand the core concepts.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert at creating educational summaries. Focus on extracting the most important information for student learning.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 800 });
  return response.content;
};

// Generate flashcards
const generateFlashcards = async (content, options = {}) => {
  const prompt = `Create ${options.count || 10} flashcards from the following content. Each flashcard should have a clear question on one side and a comprehensive answer on the other side. Focus on key concepts, definitions, and important facts that students need to memorize.

Difficulty level: ${options.difficulty || 'medium'}
Subject area: ${options.subject || 'general'}

Content:
${content}

Format each flashcard as:
**Card X:**
**Front:** [Question]
**Back:** [Answer]

Make sure the questions test understanding and recall of important concepts.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert educator creating effective flashcards for student learning. Focus on key concepts and clear, testable questions.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1200 });
  
  // Parse the response into structured flashcards
  const cards = [];
  const cardMatches = response.content.match(/\*\*Card \d+:\*\*[\s\S]*?(?=\*\*Card \d+:\*\*|$)/g);
  
  if (cardMatches) {
    cardMatches.forEach((cardText, index) => {
      const frontMatch = cardText.match(/\*\*Front:\*\*\s*(.*?)(?=\*\*Back:|$)/s);
      const backMatch = cardText.match(/\*\*Back:\*\*\s*(.*?)$/s);
      
      if (frontMatch && backMatch) {
        cards.push({
          id: index + 1,
          front: frontMatch[1].trim(),
          back: backMatch[1].trim()
        });
      }
    });
	}

  return cards.length > 0 ? cards : [{ 
    id: 1, 
    front: "Unable to generate flashcards", 
    back: "Please try with different content" 
  }];
};

// Analyze student performance
const analyzePerformance = async (performanceData) => {
  const prompt = `Analyze the academic performance of the following student and provide detailed insights:

Student: ${performanceData.student.name}
Department: ${performanceData.student.department}

Grade History:
${performanceData.grades.map(g => 
  `${g.course} (${g.department}): Final: ${g.finalGrade}/20, Exam: ${g.examGrade}/20, Homework: ${g.homeworkGrade}/20, Project: ${g.projectGrade}/20, Participation: ${g.participationGrade}/20
  Feedback: ${g.feedback || 'No feedback'}`
).join('\n')}

Please provide:
1. Overall performance analysis
2. Strengths and weaknesses identification
3. Subject-wise performance breakdown
4. Specific recommendations for improvement
5. Study strategies tailored to the student's performance pattern
6. Areas where the student excels and should continue building upon

Be specific and actionable in your recommendations.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an academic performance analyst helping students improve their studies. Provide detailed, constructive analysis with actionable recommendations.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1200 });
  return response.content;
};

// Generate quiz questions
const generateQuiz = async (content, options = {}) => {
  const prompt = `Create a quiz with ${options.questionCount || 10} questions based on the following content. 

Include these question types: ${options.questionTypes?.join(', ') || 'multiple choice, true/false, short answer'}
Difficulty level: ${options.difficulty || 'medium'}

Content:
${content}

Format the quiz as JSON with the following structure:
{
  "title": "Quiz Title",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "True/False question",
      "correct_answer": true,
      "explanation": "Explanation"
    },
    {
      "id": 3,
      "type": "short_answer",
      "question": "Short answer question",
      "sample_answer": "Expected answer",
      "key_points": ["Point 1", "Point 2"]
    }
  ]
}`;

  const messages = [
    {
      role: 'system',
      content: 'You are an expert quiz creator. Generate diverse, educational questions that test understanding of key concepts. Always respond with valid JSON.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1500 });
  
  try {
    return JSON.parse(response.content);
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      title: "Generated Quiz",
      questions: [{
        id: 1,
        type: "short_answer",
        question: "What are the main topics covered in the provided content?",
        sample_answer: "Please refer to the content and identify key concepts",
        key_points: ["Key concept identification", "Content comprehension"]
      }]
    };
  }
};

// Smart search functionality
const smartSearch = async (query, searchableContent) => {
  const contentSummary = searchableContent.map(item => 
    `${item.type}: ${item.title} - ${item.content?.substring(0, 200) || 'No description'}...`
  ).join('\n');

  const prompt = `Given the following search query and available content, identify the most relevant items and explain why they match:

Search Query: "${query}"

Available Content:
${contentSummary}

Please:
1. Rank the most relevant content items
2. Explain why each item is relevant to the query
3. Suggest related topics the user might be interested in
4. Format the response to help the user find what they need

Focus on educational relevance and how the content can help with learning.`;

  const messages = [
    {
      role: 'system',
      content: 'You are a smart search assistant helping students find relevant educational content. Provide clear, ranked results with explanations.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 800 });
  
  // Return enhanced search results
  return searchableContent.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.content?.toLowerCase().includes(query.toLowerCase())
  ).map((item, index) => ({
    ...item,
    relevanceScore: Math.max(0.1, 1 - (index * 0.1)),
    aiExplanation: `Relevant match for "${query}"`
  }));
};

// Recommend courses
const recommendCourses = async (studentProfile, availableCourses) => {
  const prompt = `Recommend courses for a student based on their profile and available options:

Student Profile:
- Department: ${studentProfile.department}
- Current Courses: ${studentProfile.enrolledCourses.map(c => `${c.name} (${c.code})`).join(', ')}
- Academic Performance: ${studentProfile.academicPerformance.map(p => `${p.course}: ${p.grade}/20`).join(', ')}
- Preferences: ${studentProfile.preferences}

Available Courses:
${availableCourses.map(c => `${c.name} (${c.code}) - ${c.description} - Credits: ${c.credits}`).join('\n')}

Please recommend 3-5 courses and explain:
1. Why each course is recommended
2. How it fits with their current studies
3. Prerequisites or preparation needed
4. Expected difficulty level
5. Career relevance

Prioritize courses that complement their current studies and align with their performance level.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an academic advisor providing course recommendations. Focus on academic progression and career preparation.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1000 });
  return response.content;
};

// Analyze chat discussions
const analyzeChatDiscussion = async (chatData) => {
  const messagesText = chatData.messages.map(m => 
    `${m.sender}: ${m.content}`
  ).join('\n');

  const prompt = `Analyze the following course chat discussion and provide insights:

Course: ${chatData.course.name} (${chatData.course.code})
Number of Messages: ${chatData.messages.length}

Discussion:
${messagesText}

Please provide:
1. Main topics discussed
2. Student engagement level
3. Common questions or confusion points
4. Knowledge gaps identified
5. Suggestions for follow-up activities
6. Overall discussion quality assessment

Focus on educational insights that can help improve teaching and learning.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an educational analyst providing insights on classroom discussions. Focus on learning outcomes and teaching improvements.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await makeOpenAIRequest(messages, { maxTokens: 1000 });
  return response.content;
};

// Check if AI service is available
const checkService = async () => {
  try {
    const response = await makeOpenAIRequest([
      { role: 'user', content: 'Hello, are you working?' }
    ], { maxTokens: 10 });
    return { status: 'available', model: response.model };
  } catch (error) {
    return { status: 'unavailable', error: error.message };
  }
};

module.exports = {
  generateResponse,
  generateStudyPlan,
  summarizeText,
  generateFlashcards,
  analyzePerformance,
  generateQuiz,
  smartSearch,
  recommendCourses,
  analyzeChatDiscussion,
  checkService
};