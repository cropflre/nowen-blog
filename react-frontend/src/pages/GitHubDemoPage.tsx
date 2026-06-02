import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GitHubProjectIdentifier from '../components/GitHubProjectIdentifier';
import type { GitHubRepoInfo } from '../types';

const GitHubDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRepo, setSelectedRepo] = React.useState<GitHubRepoInfo | null>(null);

  const handleProjectInfoFetched = (repoInfo: GitHubRepoInfo) => {
    setSelectedRepo(repoInfo);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">GitHub Project Identifier</h1>
              <p className="text-sm text-gray-400">Automatically identify and fetch GitHub repository information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 功能介绍 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Features</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">Auto Extract</h3>
                <p className="text-sm text-gray-400">Automatically extract project name and description from GitHub URL</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">Real-time Fetch</h3>
                <p className="text-sm text-gray-400">Real-time repository information via GitHub API</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">Rich Details</h3>
                <p className="text-sm text-gray-400">Get stars, forks, language, topics and more</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* GitHub 项目识别组件 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Try It Now
            </h2>
            <GitHubProjectIdentifier
              onProjectInfoFetched={handleProjectInfoFetched}
              showPreview={true}
            />
          </div>
        </motion.div>

        {/* 使用说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold mb-4">How to Use</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                1
              </span>
              <div>
                <h3 className="font-semibold">Enter GitHub URL</h3>
                <p className="text-sm text-gray-400">Paste a GitHub repository URL in the format: <code className="bg-gray-800 px-2 py-0.5 rounded">https://github.com/owner/repo</code></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-semibold">Auto Fetch</h3>
                <p className="text-sm text-gray-400">The system will automatically fetch repository information after detecting a valid GitHub URL</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </span>
              <div>
                <h3 className="font-semibold">View Details</h3>
                <p className="text-sm text-gray-400">View repository details including stars, forks, language, topics, and more</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* API 信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold mb-4">API Endpoints</h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-bold rounded">POST</span>
                <code className="text-sm text-blue-400">/api/github/repo-info</code>
              </div>
              <p className="text-sm text-gray-400">Fetch repo info by providing GitHub URL in request body</p>
              <pre className="mt-2 bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-x-auto">
{`// Request
{
  "url": "https://github.com/facebook/react"
}

// Response
{
  "success": true,
  "data": {
    "name": "react",
    "full_name": "facebook/react",
    "description": "A declarative, efficient...",
    "stargazers_count": 228000,
    ...
  }
}`}
              </pre>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded">GET</span>
                <code className="text-sm text-blue-400">/api/github/repo-info?url=...</code>
              </div>
              <p className="text-sm text-gray-400">Fetch repo info via URL query parameter</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default GitHubDemoPage;
