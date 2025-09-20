const axios = require('axios');
const pdfParse = require('pdf-parse');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async callOpenAI(messages, maxTokens = 1000) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: maxTokens,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      throw new Error('AI service temporarily unavailable');
    }
  }

  async generateStudyPlan(courses, examDates, studyHoursPerDay) {
    const prompt = `Create a personalized study plan for a computer science student at USTHB.
    
    Courses: ${courses.map(c => `${c.name} (${c.credits} credits)`).join(', ')}
    Exam Dates: ${JSON.stringify(examDates)}
    Available study hours per day: ${studyHoursPerDay}
    
    Generate a week-by-week study schedule with:
    1. Time allocation for each subject
    2. Recommended study techniques
    3. Priority levels based on exam dates
    4. Break times and revision sessions
    
    Format as JSON with clear structure.`;

    const messages = [
      {
        role: 'system',
        content: 'You are an academic advisor specializing in computer science education at USTHB Faculty of Informatics.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callOpenAI(messages, 1500);
  }

  async answerQuestion(question, courseContext = '') {
    const prompt = `Answer this computer science question from a USTHB student:
    
    Question: ${question}
    ${courseContext ? `Course Context: ${courseContext}` : ''}
    
    Provide a clear, educational answer with:
    1. Direct answer to the question
    2. Relevant examples or code if applicable
    3. Additional learning resources
    4. Related concepts they should explore`;

    const messages = [
      {
        role: 'system',
        content: 'You are a knowledgeable computer science professor at USTHB Faculty of Informatics. Provide helpful, accurate answers to student questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callOpenAI(messages, 800);
  }

  async summarizeDocument(text, documentType = 'course material') {
    const prompt = `Summarize this ${documentType} for computer science students:
    
    ${text.substring(0, 3000)}...
    
    Create:
    1. Key points summary (bullet points)
    2. Important concepts to remember
    3. Practice questions or exercises
    4. Connection to other CS topics`;

    const messages = [
      {
        role: 'system',
        content: 'You are an AI assistant helping computer science students at USTHB understand course materials.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callOpenAI(messages, 1000);
  }

  async generateFlashcards(content, subject) {
    const prompt = `Create flashcards for ${subject} based on this content:
    
    ${content.substring(0, 2000)}...
    
    Generate 10-15 flashcards in JSON format:
    [
      {
        "front": "Question or concept",
        "back": "Answer or explanation",
        "difficulty": "easy/medium/hard"
      }
    ]`;

    const messages = [
      {
        role: 'system',
        content: 'You are creating educational flashcards for computer science students.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callOpenAI(messages, 1200);
  }

  async analyzePDFContent(buffer) {
    try {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } catch (error) {
      throw new Error('Failed to parse PDF content');
    }
  }

  async generatePerformanceInsights(grades, courses) {
    const prompt = `Analyze this student's academic performance at USTHB Faculty of Informatics:
    
    Grades: ${JSON.stringify(grades)}
    Courses: ${courses.map(c => c.name).join(', ')}
    
    Provide insights on:
    1. Strengths and weaknesses by subject area
    2. Performance trends
    3. Recommendations for improvement
    4. Study strategies for weak subjects
    5. Career advice based on strong subjects`;

    const messages = [
      {
        role: 'system',
        content: 'You are an academic advisor analyzing student performance in computer science.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.callOpenAI(messages, 1000);
  }
}

module.exports = new AIService();