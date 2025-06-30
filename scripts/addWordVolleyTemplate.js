// Client-side script to add WordVolley template
// Run this in the browser console when logged in as a teacher

async function addWordVolleyTemplate() {
  // Import Firebase functions
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('../src/config/firebase.js');
  
  try {
    console.log('🏓 Adding WordVolley template...');
    
    const wordVolleyTemplate = {
      title: 'Short A Words vs Long A Words',
      type: 'word-volley',
      description: 'Educational Pong-style game where students hit short A words while avoiding long A words',
      difficulty: 'medium',
      gameSpeed: 3,
      paddleSize: 5,
      theme: 'classic',
      targetCategory: {
        id: 'target',
        name: 'Short A Words',
        words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'van', 'can', 'man', 'pan', 'ran', 'tan', 'fan', 'bag', 'tag', 'rag', 'wag', 'lag']
      },
      nonTargetCategory: {
        id: 'non-target', 
        name: 'Long A Words',
        words: ['cake', 'make', 'take', 'bake', 'lake', 'wake', 'snake', 'grape', 'plate', 'gate', 'late', 'date', 'rate', 'hate', 'mate', 'fate', 'game', 'name', 'same', 'came']
      },
      gameTime: 60,
      winningScore: 10,
      createdAt: serverTimestamp(),
      userId: 'system',
      createdBy: 'System Template'
    };

    const docRef = await addDoc(collection(db, 'blankGameTemplates'), wordVolleyTemplate);
    console.log('✅ WordVolley template added with ID:', docRef.id);
    console.log('🔄 Refresh the page to see the new template in "Start Creating"');
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding WordVolley template:', error);
    throw error;
  }
}

// Export for use
window.addWordVolleyTemplate = addWordVolleyTemplate;

console.log('🏓 WordVolley template script loaded!');
console.log('📝 Run: addWordVolleyTemplate() to add the template'); 