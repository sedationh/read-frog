import { HighlightPanel } from '../highlight/HighlightPanel'

export function HighlightDemo() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        📝 Text Highlighter Demo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Area */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">📄 Sample Content</h2>
          <div
            id="demo-content"
            className="p-6 bg-gray-50 border rounded-lg leading-relaxed space-y-4 select-text"
          >
            <h3 className="text-lg font-semibold text-gray-800">About Artificial Intelligence</h3>
            <p>
              Artificial Intelligence (AI) is a branch of computer science that aims to create
              intelligent machines capable of performing tasks that typically require human intelligence.
              These tasks include learning, reasoning, perception, and language understanding.
            </p>
            <p>
              <strong>Machine Learning</strong>
              {' '}
              is a core technology of AI that enables machines
              to learn from data and make decisions or predictions. Deep learning, a subset of
              machine learning, uses neural networks to simulate the human brain's learning process.
            </p>
            <p>
              Currently, AI technology is widely applied in various fields:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Natural Language Processing</strong>
                {' '}
                - Speech recognition, machine translation, text analysis
              </li>
              <li>
                <strong>Computer Vision</strong>
                {' '}
                - Image recognition, facial detection, autonomous driving
              </li>
              <li>
                <strong>Recommendation Systems</strong>
                {' '}
                - Personalized recommendations, intelligent search
              </li>
              <li>
                <strong>Robotics</strong>
                {' '}
                - Industrial automation, service robots
              </li>
            </ul>
            <p>
              As technology continues to advance, artificial intelligence will play an increasingly
              important role in more fields, transforming how we live and work.
            </p>

            <blockquote className="p-4 bg-blue-50 border-l-4 border-blue-500 italic text-gray-700">
              "Artificial intelligence will be the last invention that humanity will ever need to make." - Nick Bostrom
            </blockquote>
          </div>
        </div>

        {/* Highlighter Panel */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🎨 Highlighter Controls</h2>
          <HighlightPanel
            containerSelector="#demo-content"
            enabled={true}
            onHighlightCreated={() => {
              // Optional: Add any callback logic here
            }}
            onHighlightRemoved={() => {
              // Optional: Add any callback logic here
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">💡 How to use:</h3>
        <ol className="list-decimal list-inside space-y-2 text-yellow-700">
          <li>
            Make sure the highlighter is
            <strong>Enabled</strong>
            {' '}
            (check the top-right button)
          </li>
          <li>Select any text in the content area on the left</li>
          <li>The selected text will be automatically highlighted and saved</li>
          <li>Choose different colors from the color picker</li>
          <li>Manage your highlights in the highlights list</li>
          <li>
            Click
            <strong>"Test Restore"</strong>
            {' '}
            to verify that highlights persist after page reload
          </li>
          <li>
            Use
            <strong>"Clear All"</strong>
            {' '}
            to remove all highlights
          </li>
        </ol>
      </div>
    </div>
  )
}
