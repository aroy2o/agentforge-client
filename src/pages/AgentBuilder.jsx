import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import { addAgent } from '../store/agentsSlice';
import AppLayout from '../components/layout/AppLayout';
import AgentCard from '../components/agents/AgentCard';
import { TOOLS } from '../constants/tools';
import Translate from '../components/layout/Translate';
import { generateAgentPrompt } from '../services/api';
import { registerVoicePageHandlers } from '../utils/voicePageHandlers';

const AGENT_COLORS = [
  '#00d4ff',
  '#a78bfa',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#fb923c',
  '#e879f9',
];

const AGENT_CATEGORIES = ['Research', 'Creative', 'Business', 'Technical', 'General'];

export default function AgentBuilder() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const existingAgents = useAppSelector((state) => state.agents.agents);

  // Wizard State
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 1: User Intent Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');

  // Step 2: Refinement & Configuration Fields
  const [role, setRole] = useState('Custom Agent'); // Auto-populated if possible, or user sets it
  const [personality, setPersonality] = useState('');
  const [selectedTools, setSelectedTools] = useState([]);
  const [selectedColor, setSelectedColor] = useState(AGENT_COLORS[0]);
  const [category, setCategory] = useState(AGENT_CATEGORIES[0]);

  const [errors, setErrors] = useState({ name: '', description: '', role: '', tools: '' });

  useEffect(() => {
    const unregister = registerVoicePageHandlers({
      openForm: () => {
        if (step !== 1) setStep(1);
      },
    }, () => ({
      agentRoster: existingAgents.map((a) => a.name).filter(Boolean),
      builderStep: step,
    }));

    return unregister;
  }, [existingAgents, step]);

  const isNameUnique = (testName) => {
    return !existingAgents.some((a) => a.name.toLowerCase() === testName.trim().toLowerCase());
  };

  const handleToolToggle = (toolId) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
    if (errors.tools) setErrors((prev) => ({ ...prev, tools: '' }));
  };

  // Step 1 -> Step 2 transition
  const handleGenerate = async () => {
    const newErrors = { name: '', description: '', role: '', tools: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (!isNameUnique(name)) {
      newErrors.name = 'An agent with this name already exists';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Agent description is required';
      isValid = false;
    }

    setErrors(newErrors);
    if (!isValid) return;

    setIsGenerating(true);

    try {
      // Split examples by comma
      const exampleArray = examples.split(',').map(e => e.trim()).filter(e => e);

      const payload = {
        name: name.trim(),
        role: role.trim(), // Starts as "Custom Agent" but is sent to give context
        description: description.trim(),
        examples: exampleArray
      };

      const result = await generateAgentPrompt(payload);
      setPersonality(result.generatedPersonality);
      setStep(2);
      toast.success('Agent instructions crafted successfully!');
    } catch (err) {
      console.error('Failed to generate prompt', err);
      toast.error('Failed to generate agent instructions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = () => {
    let isValid = true;
    const newErrors = { name: '', description: '', role: '', tools: '' };

    if (!role.trim()) {
      newErrors.role = 'Role is required';
      isValid = false;
    }
    if (selectedTools.length === 0) {
      newErrors.tools = 'Select at least one tool';
      isValid = false;
    }

    setErrors(newErrors);
    if (!isValid) return;

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const newAgent = {
      id: generateId(),
      name: name.trim(),
      role: role.trim(),
      personality: personality.trim(),
      category: category,
      color: selectedColor,
      tools: selectedTools,
      memory: [],
      createdAt: new Date().toISOString()
    };

    dispatch(addAgent(newAgent));
    toast.success(`Agent ${newAgent.name} deployed to workforce.`);
    navigate('/');
  };

  // Mock agent map for live preview
  const mockAgent = {
    id: 'preview',
    name: name.trim() || 'Agent Name',
    role: role.trim() || 'Role',
    personality: personality.trim(),
    category: category,
    color: selectedColor,
    tools: selectedTools,
    memory: [],
  };

  const inputClass = "w-full glass-input rounded-lg p-3.5 text-sm font-mono outline-none transition-all focus:ring-1 focus:ring-accent-cyan";

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto scrollbar-thin p-6 md:p-8 bg-transparent">
        <div className="glass-card max-w-6xl w-full mx-auto relative z-10 p-6 md:p-8">

          {/* Header & Step Indicator */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-subtle pb-6">
            <div>
              <h1 className="text-lg uppercase tracking-widest text-accent-cyan font-bold mb-2">
                <Translate>AI Agent Builder</Translate>
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                <Translate>Describe your need. The Forge will craft the perfect AI operating profile.</Translate>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${step >= 1 ? 'glass-button-primary text-white' : 'border border-subtle text-slate-500'}`}>1</div>
                <span className={`text-xs uppercase tracking-widest ${step >= 1 ? 'text-slate-200' : 'text-slate-500'}`}>Describe</span>
              </div>
              <div className={`w-8 h-[1px] ${step === 2 ? 'bg-accent-cyan opacity-50' : 'bg-slate-700'}`}></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${step === 2 ? 'glass-button-primary text-white' : 'border border-subtle text-slate-500'}`}>2</div>
                <span className={`text-xs uppercase tracking-widest ${step === 2 ? 'text-slate-200' : 'text-slate-500'}`}>Customize</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Column: Flow Context */}
            <div className="flex flex-col gap-6">

              {/* STEP 1 */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
                    <Translate>Step 1: Describe Your Agent</Translate>
                  </h2>

                  <div className="flex flex-col gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                        <Translate>Agent Name</Translate>
                      </label>
                      <input
                        type="text"
                        value={name}
                        disabled={isGenerating}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        className={`${inputClass} ${isGenerating ? 'opacity-50' : ''}`}
                        placeholder="e.g. Atlas, Nova, Synthetix..."
                      />
                      {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
                    </div>

                    {/* Behavior Description */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                        <Translate>What does this agent do?</Translate>
                      </label>
                      <textarea
                        value={description}
                        disabled={isGenerating}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                        }}
                        className={`${inputClass} resize-none h-[120px] leading-relaxed ${isGenerating ? 'opacity-50' : ''}`}
                        placeholder="e.g. Helps me research competitors and analyze their pricing strategies, or Reviews my code and suggests structural improvements..."
                      />
                      {errors.description && <div className="text-xs text-red-500 mt-1">{errors.description}</div>}
                    </div>

                    {/* Examples */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                        <Translate>Example Tasks (Optional)</Translate>
                      </label>
                      <input
                        type="text"
                        value={examples}
                        disabled={isGenerating}
                        onChange={(e) => setExamples(e.target.value)}
                        className={`${inputClass} ${isGenerating ? 'opacity-50' : ''}`}
                        placeholder="Add up to 3 example tasks separated by commas..."
                      />
                      <p className="text-[10px] text-slate-500 mt-1"><Translate>This helps the AI understand the agent better.</Translate></p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-6 border-t border-subtle">
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !name.trim() || !description.trim()}
                        className="w-full glass-button-primary rounded-lg py-4 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex justify-center items-center gap-3 relative overflow-hidden"
                      >
                        {isGenerating ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          <span><Translate>ARIA is crafting your agent instructions...</Translate></span>
                          </>
                        ) : (
                          <>
                            <span><Translate>Generate Agent</Translate></span>
                            <span className="text-accent-cyan/80">✨</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
                      <Translate>Step 2: Review & Customize</Translate>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-slate-400 hover:text-white transition-colors uppercase font-mono tracking-widest border border-subtle px-3 py-1 rounded-md cursor-pointer"
                    >
                      <Translate>Back</Translate>
                    </button>
                  </h2>

                  <div className="flex flex-col gap-6">
                    {/* Role & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                          <Translate>Role Title</Translate>
                        </label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => {
                            setRole(e.target.value);
                            if (errors.role) setErrors((prev) => ({ ...prev, role: '' }));
                          }}
                          className={inputClass}
                        />
                        {errors.role && <div className="text-xs text-red-500 mt-1">{errors.role}</div>}
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                          <Translate>Category</Translate>
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className={`${inputClass} appearance-none bg-slate-900/50 cursor-pointer`}
                        >
                          {AGENT_CATEGORIES.map(c => (
                            <option key={c} value={c} className="bg-slate-900">{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* AI Generated Instructions */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs uppercase tracking-widest text-slate-400">
                          <Translate>Your Agent's Instructions</Translate>
                        </label>
                        <span className="text-[10px] text-accent-cyan/80 bg-accent-cyan/10 px-2 py-0.5 rounded-sm uppercase tracking-widest"><Translate>Feel free to edit</Translate></span>
                      </div>
                      <textarea
                        value={personality}
                        onChange={(e) => setPersonality(e.target.value)}
                        className={`${inputClass} resize-y min-h-[250px] leading-relaxed text-slate-300 font-mono text-[13px] border border-accent-cyan/30 bg-accent-cyan/5`}
                      />
                    </div>

                    {/* Tools */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                        <Translate>Capabilities / Tools</Translate>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TOOLS.map((tool) => {
                          const isSelected = selectedTools.includes(tool.id);
                          return (
                            <button
                              key={tool.id}
                              onClick={() => handleToolToggle(tool.id)}
                              className="rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
                              style={
                                isSelected
                                  ? {
                                    backgroundColor: `${tool.color}33`,
                                    borderColor: `${tool.color}99`,
                                    color: tool.color,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                  }
                                  : {
                                    backgroundColor: 'transparent',
                                    borderColor: '#1a2840',
                                    color: '#334155',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                  }
                              }
                            >
                              <span>{tool.icon}</span>
                              <Translate>{tool.name}</Translate>
                            </button>
                          );
                        })}
                      </div>
                      {errors.tools && <div className="text-xs text-red-500 mt-1">{errors.tools}</div>}
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                        <Translate>Avatar Color</Translate>
                      </label>
                      <div className="flex gap-2">
                        {AGENT_COLORS.map((color) => {
                          const isSelected = selectedColor === color;
                          return (
                            <div
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className="w-[28px] h-[28px] rounded-md cursor-pointer transition-all"
                              style={{
                                backgroundColor: color,
                                border: isSelected ? '2px solid white' : 'none',
                                opacity: isSelected ? 1 : 0.5,
                                boxSizing: 'border-box'
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4 pt-6 border-t border-subtle">
                      <button
                        onClick={handleDeploy}
                        disabled={!role.trim() || !personality.trim() || selectedTools.length === 0}
                        className="px-[20px] py-[12px] glass-button-primary rounded-lg text-xs font-mono uppercase tracking-widest font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-1"
                      >
                        <Translate>Deploy Agent</Translate>
                      </button>

                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-[20px] py-[12px] border border-accent-cyan/40 bg-accent-cyan/5 text-accent-cyan rounded-lg text-xs font-mono uppercase tracking-widest hover:bg-accent-cyan/10 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <span><Translate>Regenerate</Translate></span>
                        )}
                      </button>

                      <button
                        onClick={() => navigate('/')}
                        className="px-[16px] py-[12px] bg-transparent border border-transparent text-slate-400 rounded-lg text-xs font-mono uppercase tracking-widest hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Translate>Cancel</Translate>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Preview */}
            <div className="flex flex-col relative">
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-3">
                <Translate>Live Preview</Translate>
              </label>
              <div className="glass-card rounded-xl p-6 h-auto sticky top-4 transition-all duration-300">
                <AgentCard
                  agent={mockAgent}
                  isActive={false}
                  inPipeline={false}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-4 italic leading-relaxed text-center px-4">
                <Translate>This agent will be immediately available in your roster and pipeline builder.</Translate>
              </p>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
