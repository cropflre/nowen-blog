import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit3, Eye, Search, RefreshCw, FolderOpen, FileText, X } from 'lucide-react';
import { api } from '../api';
import type { Content, ProjectInfo } from '../types';

interface ProjectDocsDashboardProps {
  onEditDoc?: (id: number) => void;
  onNewDoc?: () => void;
}

export default function ProjectDocsDashboard({ onEditDoc, onNewDoc }: ProjectDocsDashboardProps) {
  const { t, i18n } = useTranslation();
  const [contents, setContents] = useState<Content[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGithubUrl, setNewProjectGithubUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [fetchingRepo, setFetchingRepo] = useState(false);
  const [repoDescription, setRepoDescription] = useState('');
  const [repoReadme, setRepoReadme] = useState('');
  // 自动获取 GitHub 仓库信息
  useEffect(() => {
    const fetchRepoInfo = async () => {
      if (!newProjectGithubUrl.trim() || !newProjectGithubUrl.includes('github.com')) {
        setRepoDescription('');
        setRepoReadme('');
        return;
      }

      setFetchingRepo(true);
      try {
        const result = await api.fetchGitHubRepoWithREADME(newProjectGithubUrl.trim());
        if (result.success && result.data) {
          if (result.data.repo_info?.description) {
            setRepoDescription(result.data.repo_info.description);
          }
          if (result.data.readme) {
            setRepoReadme(result.data.readme);
          }
        }
      } catch (error) {
        console.error('Failed to fetch repo info:', error);
      } finally {
        setFetchingRepo(false);
      }
    };

    const timer = setTimeout(fetchRepoInfo, 1000);
    return () => clearTimeout(timer);
  }, [newProjectGithubUrl]);


  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await api.getProjectsList();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].project_name);
        }
        if (data.length === 0) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    
    let cancelled = false;
    const loadContents = async () => {
      setLoading(true);
      try {
        const response = await api.getContents({
          type: 'doc',
          project: selectedProject,
          pageSize: 50,
        });
        if (!cancelled) {
          setContents(response.data);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch contents:', error);
          setLoading(false);
        }
      }
    };
    loadContents();
    return () => { cancelled = true; };
  }, [selectedProject, refreshKey]);

  const deleteDoc = async (id: number) => {
    if (!confirm(t('admin.confirmDelete'))) return;
    try {
      await api.adminDeleteContent(id);
      setContents(contents.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete doc:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    const projectName = newProjectName.trim();
    
    // 检查项目是否已存在
    const existingProject = projects.find(p => p.project_name === projectName);
    if (existingProject) {
      setSelectedProject(projectName);
      setNewProjectName('');
      setNewProjectGithubUrl('');
      setShowNewProjectModal(false);
      setRepoDescription('');
      setRepoReadme('');
      return;
    }
    
    setCreating(true);
    const timestamp = Date.now();
    const slug = projectName.toLowerCase().replace(/\s+/g, '-') + '-readme-' + timestamp;
    
    try {
      await api.adminCreateContent({
        type: 'doc',
        project_name: projectName,
        github_url: newProjectGithubUrl.trim(),
        title: projectName + ' - README',
        slug: slug,
        summary: repoDescription || 'Documentation for ' + projectName,
        content: repoReadme || '# ' + projectName + '\n\nWelcome to the project documentation.',
        status: 'published',
      });
      
      const data = await api.getProjectsList();
      setProjects(data);
      setSelectedProject(projectName);
      
      setNewProjectName('');
      setNewProjectGithubUrl('');
      setShowNewProjectModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredContents = contents.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* 顶部控制栏 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-12 border-b border-[var(--color-border-surface)] pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[var(--color-text-primary)] mb-2">
              <span className="text-blue-500">&gt;</span> {t('admin.projectDocs')}
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              <span className="text-[var(--color-text-muted)]">//</span> {t('admin.coreConsoleDesc')}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all"
            >
              <FolderOpen size={16} />
              <span>{t('admin.newProject')}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewDoc}
              className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-all"
            >
              <Plus size={16} />
              <span>{t('admin.newArticle')}</span>
            </motion.button>
          </div>
        </div>

        {/* 项目选择和统计 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* 项目列表 */}
          <div className="lg:col-span-1">
            <h3 className="text-sm text-[var(--color-text-muted)] mb-3">{t('admin.selectProject')}</h3>
            <div className="space-y-2">
              {projects.map((project) => (
                <motion.button
                  key={project.project_name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedProject(project.project_name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                    selectedProject === project.project_name
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                      : 'bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={14} />
                    <span className="text-sm truncate">{project.project_name}</span>
                  </div>
                  <span className="text-xs opacity-60">{project.doc_count}</span>
                </motion.button>
              ))}
              
              {projects.length === 0 && !loading && (
                <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                  {t('admin.noProjects')}
                </div>
              )}
            </div>
          </div>

          {/* 文档列表 */}
          <div className="lg:col-span-3">
            {/* 搜索栏 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder={t('admin.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRefreshKey(k => k + 1)}
                className="p-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-all"
              >
                <RefreshCw size={16} />
              </motion.button>
            </div>

            {/* 文档列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw size={16} />
                  </motion.div>
                  <span className="text-sm font-mono">{t('admin.loadingData')}</span>
                </div>
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
                <FileText size={48} className="mb-4 opacity-30" />
                <p className="text-sm font-mono">{selectedProject ? t('admin.noDocsFound') : t('admin.selectProjectFirst')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredContents.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, padding: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1], delay: index * 0.05 }}
                      className="group relative flex items-center justify-between p-5 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-xl overflow-hidden hover:border-[var(--color-accent)] transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative flex items-center gap-4">
                        <div className="relative">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            doc.status === 'published' 
                              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                              : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          }`} />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors text-lg">
                              {doc.title}
                            </h3>
                            {doc.order > 0 && (
                              <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                                #{doc.order}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-xs text-[var(--color-text-muted)] font-mono">
                              <span className="text-[var(--color-text-muted)]">{t('admin.slug')}:</span> {doc.slug}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">•</span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {doc.tags && doc.tags.split(',').map(tag => (
                                <span key={tag} className="inline-block bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded mr-1 text-[var(--color-text-secondary)]">
                                  #{tag.trim()}
                                </span>
                              ))}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 font-mono">
                            {t('admin.syncedAt')}: {new Date(doc.updated_at).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
                          </p>
                        </div>
                      </div>

                      <div className="relative flex items-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors"
                          title={t('admin.preview')}
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEditDoc?.(doc.id)}
                          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 transition-colors"
                          title={t('admin.edit')}
                        >
                          <Edit3 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteDoc(doc.id)}
                          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                          title={t('admin.delete')}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="mt-8 pt-4 border-t border-[var(--color-border-surface)] flex justify-between items-center text-xs text-[var(--color-text-muted)] font-mono">
          <span>{t('admin.sysStatus')}: <span className="text-emerald-500">{t('admin.online')}</span></span>
          <span>
            {selectedProject && (
              <>
                <span className="text-[var(--color-text-secondary)]">{selectedProject}</span>
                <span className="mx-2">•</span>
                <span>{t('admin.docCount')}: <span className="text-[var(--color-text-secondary)]">{contents.length}</span></span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNewProjectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[calc(100%-2rem)] max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl p-4 md:p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t('admin.newProject')}
                </h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                    {t('admin.projectName')} *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-2">
                    GitHub URL ({t('admin.optional')})
                  </label>
                  <input
                    type="text"
                    value={newProjectGithubUrl}
                    onChange={(e) => setNewProjectGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg hover:border-[var(--color-accent)] transition-colors"
                >
                  {t('admin.cancel')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw size={16} />
                    </motion.div>
                  ) : (
                    <FolderOpen size={16} />
                  )}
                  <span>{creating ? t('admin.creating') : t('admin.create')}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




