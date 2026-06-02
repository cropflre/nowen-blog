import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { GitHubRepoInfo } from '../types';

interface GitHubProjectIdentifierProps {
  onProjectInfoFetched?: (repoInfo: GitHubRepoInfo) => void;
  initialURL?: string;
  showPreview?: boolean;
}

const GitHubProjectIdentifier: React.FC<GitHubProjectIdentifierProps> = ({
  onProjectInfoFetched,
  initialURL = '',
  showPreview = true,
}) => {
  const [url, setUrl] = useState(initialURL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [debouncedURL, setDebouncedURL] = useState('');

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedURL(url);
    }, 800);
    return () => clearTimeout(timer);
  }, [url]);

  // 自动获取仓库信息（当 URL 变化且有效时�?
  useEffect(() => {
    if (debouncedURL && isValidGitHubURL(debouncedURL)) {
      handleFetchRepoInfo(debouncedURL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedURL]);

  // 验证是否为有效的 GitHub URL
  const isValidGitHubURL = (url: string): boolean => {
    const pattern = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?/;
    return pattern.test(url.trim());
  };

  // 获取仓库信息
  const handleFetchRepoInfo = async (urlToFetch?: string) => {
    const targetURL = urlToFetch || url;
    
    if (!targetURL.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!isValidGitHubURL(targetURL)) {
      setError('Please enter a valid GitHub URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.fetchGitHubRepoByURL(targetURL.trim());
      
      if (response.success && response.data) {
        setRepoInfo(response.data);
        if (onProjectInfoFetched) {
          onProjectInfoFetched(response.data);
        }
      } else {
        setError(response.message || 'Failed to fetch repository information');
        setRepoInfo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository information');
      setRepoInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // 格式化日�?
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="github-project-identifier">
      {/* 输入区域 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub Repository URL
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
            }}
            placeholder="https://github.com/owner/repo"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <button
            onClick={() => handleFetchRepoInfo()}
            disabled={loading || !url.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Fetching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Fetch Info
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* 仓库信息预览 */}
      {showPreview && repoInfo && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={repoInfo.owner.avatar_url}
                alt={repoInfo.owner.login}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <a
                    href={repoInfo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors"
                  >
                    {repoInfo.full_name}
                  </a>
                  {repoInfo.private && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      Private
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">
                  Created {formatDate(repoInfo.created_at)}
                </p>
              </div>
            </div>
            <a
              href={repoInfo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>

          {/* 项目描述 */}
          {repoInfo.description && (
            <p className="text-gray-300 leading-relaxed">
              {repoInfo.description}
            </p>
          )}

          {/* 项目统计 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {repoInfo.language && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {repoInfo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              {repoInfo.stargazers_count.toLocaleString()} stars
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
              {repoInfo.forks_count.toLocaleString()} forks
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              {repoInfo.watchers_count.toLocaleString()} watchers
            </span>
            <span className="text-gray-500">
              Updated {formatDate(repoInfo.updated_at)}
            </span>
          </div>

          {/* Topics */}
          {repoInfo.topics && repoInfo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {repoInfo.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Homepage */}
          {repoInfo.homepage && (
            <div className="pt-2 border-t border-gray-700">
              <a
                href={repoInfo.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                {repoInfo.homepage}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GitHubProjectIdentifier;
