import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { setTaskGoal, setRecipientEmail, setToolAttachments, clearToolAttachments } from '../../store/taskSlice';
import { clearLogs } from '../../store/logsSlice';
import Translate from '../layout/Translate';
import { useTranslatedText } from '../../hooks/useTranslatedText';
import { addTranslation } from '../../store/languageSlice';
import * as api from '../../services/api';
import toast from 'react-hot-toast';
import { clearPipeline, addToPipeline } from '../../store/pipelineSlice';
import { detectPipeline } from '../../utils/detectPipeline';

const CODE_LANGUAGE_LABELS = {
    javascript: 'JavaScript',
    python: 'Python',
    bash: 'Bash',
};

const truncateLabel = (value, max = 20) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
};

const toKilobytes = (bytes) => {
    const size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return 0;
    return Math.max(1, Math.round(size / 1024));
};

const parseDatasetRowCount = (rawData) => {
    const text = String(rawData || '').trim();
    if (!text) return 0;

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.length;
        if (Array.isArray(parsed?.data)) return parsed.data.length;
    } catch {
        // Continue to CSV parsing.
    }

    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) return 0;
    if (lines.length === 1) return 1;
    return Math.max(lines.length - 1, 1);
};

// DISABLED — re-enable when ready to implement
// const countChartPoints = (chartRequest) => {
//     const content = String(chartRequest?.content || '').trim();
//     if (!content) return 0;
//     try {
//         const parsed = JSON.parse(content);
//         if (Array.isArray(parsed)) return parsed.length;
//         if (Array.isArray(parsed?.data)) return parsed.data.length;
//     } catch {
//         // Best-effort extraction from mixed text.
//     }
//     const arrayMatch = content.match(/\[[\s\S]*\]/);
//     if (!arrayMatch) return 0;
//     try {
//         const parsed = JSON.parse(arrayMatch[0].replace(/'/g, '"'));
//         return Array.isArray(parsed) ? parsed.length : 0;
//     } catch {
//         return 0;
//     }
// };

export default function TaskInput({ onExecute }) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const taskGoal = useAppSelector((state) => state.task.taskGoal);
    const recipientEmail = useAppSelector((state) => state.task.recipientEmail);
    const isRunning = useAppSelector((state) => state.task.isRunning);
    const pipeline = useAppSelector((state) => state.pipeline.pipeline);
    const agents = useAppSelector((state) => state.agents.agents);
    const agentsHydrated = useAppSelector((state) => state.agents.hydrated);
    const pipelineResult = useAppSelector((state) => state.task.pipelineResult);
    
    // Suggestion state
    const [suggestion, setSuggestion] = useState(null);
    const [attachedPDF, setAttachedPDF] = useState('');
    const [attachedPDFName, setAttachedPDFName] = useState('');
    const [attachedPDFSizeKb, setAttachedPDFSizeKb] = useState(0);
    const [pdfUploadStatus, setPdfUploadStatus] = useState('idle'); // idle | processing | ready | error
    // DISABLED — re-enable when ready to implement
    // const [attachedImage, setAttachedImage] = useState('');
    // const [attachedImageName, setAttachedImageName] = useState('');
    // const [attachedImageMeta, setAttachedImageMeta] = useState(null);
    // const [imageUploadStatus, setImageUploadStatus] = useState('idle'); // idle | processing | ready | error
    // DISABLED — re-enable when ready to implement
    // const [attachedCode, setAttachedCode] = useState('');
    // const [codeLanguage, setCodeLanguage] = useState('javascript');
    // DISABLED — re-enable when ready to implement
    // const [attachedData, setAttachedData] = useState('');
    const [currencyAmount, setCurrencyAmount] = useState('');
    const [currencyFrom, setCurrencyFrom] = useState('USD');
    const [currencyTo, setCurrencyTo] = useState('INR');
    // DISABLED — re-enable when ready to implement
    // const [showCodeModal, setShowCodeModal] = useState(false);
    // const [showDataModal, setShowDataModal] = useState(false);
    const [showCurrencyInline, setShowCurrencyInline] = useState(false);
    const [currencyPreview, setCurrencyPreview] = useState('');
    const [currencyPreviewLoading, setCurrencyPreviewLoading] = useState(false);
    // DISABLED — re-enable when ready to implement
    // const [chartRequest, setChartRequest] = useState(null);

    const prevCodeValueRef = useRef('');
    const prevDataValueRef = useRef('');
    const prevCurrencyReadyRef = useRef(false);
    const prevIsRunningRef = useRef(false);

    const pdfInputRef = useRef(null);
    // DISABLED — re-enable when ready to implement
    // const imageInputRef = useRef(null);

    // Grab localized placeholder directly from the Redux cache
    const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage);
    const translations = useAppSelector((state) => state.language.translations) || {};
    const userPreferences = useAppSelector((state) => state.auth.userPreferences);
    const notificationSettings = useAppSelector((state) => state.auth.notifications);
    const defaultPlaceholder = "Assign a mission to your pipeline... e.g. 'Research AI trends and write a structured executive report with key findings.'";
    const localizedPlaceholder = (selectedLanguage !== 'en' && translations[selectedLanguage]?.[defaultPlaceholder]) || defaultPlaceholder;
    const recommendedText = useTranslatedText('Recommended:');
    const matchText = useTranslatedText('match');
    const replacePredictionNotice = useTranslatedText('Prediction is ready. Applying it will replace your current pipeline.');
    const openMemoryPanelText = useTranslatedText('Open Memory Panel');
    const replacePredictionText = useTranslatedText('Replace With Prediction');
    const useThisPipelineText = useTranslatedText('Use This Pipeline');
    const predictPipelineText = useTranslatedText('Predict Pipeline');
    const predictPipelineTitleText = useTranslatedText('Predict best pipeline for current prompt');
    const clearAttachText = useTranslatedText('Clear Attach');
    const translatedSuggestionLabel = useTranslatedText(suggestion?.label || '');

    // Fetch the translation if it hasn't been cached
    useEffect(() => {
        if (selectedLanguage !== 'en' && !translations[selectedLanguage]?.[defaultPlaceholder]) {
            api.translate(defaultPlaceholder, selectedLanguage).then(res => {
                dispatch(addTranslation({ lang: selectedLanguage, original: defaultPlaceholder, translated: res }));
            }).catch(e => console.error("Failed to translate placeholder", e));
        }
    }, [selectedLanguage, translations, dispatch, defaultPlaceholder]);

    const isExecutable = agentsHydrated && !isRunning && taskGoal.trim() !== '' && pipeline.length > 0;

    const resolveAgentById = (candidateId) =>
        agents.find((a) => String(a.id || a._id) === String(candidateId));

    const runPipelinePrediction = () => {
        if (!userPreferences?.showPipelineRecommendations) {
            setSuggestion(null);
            return;
        }
        if (taskGoal.trim().length < 8) {
            setSuggestion(null);
            return;
        }
        setSuggestion(detectPipeline(taskGoal, agents));
    };

    // Detect pipeline suggestion
    useEffect(() => {
        if (!userPreferences?.showPipelineRecommendations) {
            setSuggestion(null);
            return;
        }

        const timer = setTimeout(() => {
            if (taskGoal.length > 8) {
                setSuggestion(detectPipeline(taskGoal, agents));
            } else {
                setSuggestion(null);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [taskGoal, pipeline.length, agents, userPreferences?.showPipelineRecommendations]);

    useEffect(() => {
        dispatch(setToolAttachments({
            attachedPDF,
            attachedPDFName,
            attachedPDFSizeKb,
            // DISABLED — re-enable when ready to implement
            // attachedImage,
            // attachedImageName,
            // attachedImageMeta,
            // attachedCode,
            // codeLanguage,
            // attachedData,
            currencyRequest: currencyAmount ? {
                amount: Number(currencyAmount),
                from: currencyFrom,
                to: currencyTo,
            } : null,
            // chartRequest,
        }));
    }, [
        attachedPDF,
        attachedPDFName,
        attachedPDFSizeKb,
        // attachedImage,
        // attachedImageName,
        // attachedImageMeta,
        // attachedCode,
        // codeLanguage,
        // attachedData,
        currencyAmount,
        currencyFrom,
        currencyTo,
        // chartRequest,
        dispatch,
    ]);

    const resetAttachmentInputs = () => {
        if (pdfInputRef.current) pdfInputRef.current.value = '';
        // DISABLED — re-enable when ready to implement
        // if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const clearAllAttachments = () => {
        dispatch(clearToolAttachments());
        setAttachedPDF('');
        setAttachedPDFName('');
        setAttachedPDFSizeKb(0);
        setPdfUploadStatus('idle');
        // DISABLED — re-enable when ready to implement
        // setAttachedImage('');
        // setAttachedImageName('');
        // setAttachedImageMeta(null);
        // setImageUploadStatus('idle');
        // setAttachedCode('');
        // setCodeLanguage('javascript');
        // setAttachedData('');
        setCurrencyAmount('');
        setCurrencyFrom('USD');
        setCurrencyTo('INR');
        setCurrencyPreview('');
        // setChartRequest(null);
        resetAttachmentInputs();
    };

    const clearAttachmentByType = (type) => {
        if (type === 'pdf') {
            setAttachedPDF('');
            setAttachedPDFName('');
            setAttachedPDFSizeKb(0);
            setPdfUploadStatus('idle');
            if (pdfInputRef.current) pdfInputRef.current.value = '';
            return;
        }
        // DISABLED — re-enable when ready to implement
        // if (type === 'image') {
        //     setAttachedImage('');
        //     setAttachedImageName('');
        //     setAttachedImageMeta(null);
        //     setImageUploadStatus('idle');
        //     if (imageInputRef.current) imageInputRef.current.value = '';
        //     return;
        // }
        // DISABLED — re-enable when ready to implement
        // if (type === 'code') {
        //     setAttachedCode('');
        //     setCodeLanguage('javascript');
        //     return;
        // }
        // DISABLED — re-enable when ready to implement
        // if (type === 'data') {
        //     setAttachedData('');
        //     return;
        // }
        if (type === 'currency') {
            setCurrencyAmount('');
            setCurrencyFrom('USD');
            setCurrencyTo('INR');
            setCurrencyPreview('');
            return;
        }
        // DISABLED — re-enable when ready to implement
        // if (type === 'chart') {
        //     setChartRequest(null);
        // }
    };

    // DISABLED — re-enable when ready to implement
    // useEffect(() => {
    //     const previous = prevCodeValueRef.current;
    //     const current = String(attachedCode || '').trim();
    //     if (!previous && current) {
    //         const languageLabel = CODE_LANGUAGE_LABELS[codeLanguage] || 'Code';
    //         toast.success(`⚙️ ${languageLabel} code attached — ready to run`, { duration: 3000 });
    //     }
    //     prevCodeValueRef.current = current;
    // }, [attachedCode, codeLanguage]);

    // DISABLED — re-enable when ready to implement
    // useEffect(() => {
    //     const previous = prevDataValueRef.current;
    //     const current = String(attachedData || '').trim();
    //     if (!previous && current) {
    //         const rows = parseDatasetRowCount(current);
    //         toast.success(`🗄️ Dataset attached — ${rows} rows detected`, { duration: 3000 });
    //     }
    //     prevDataValueRef.current = current;
    // }, [attachedData]);

    useEffect(() => {
        const amount = Number(currencyAmount);
        const currencyReady = Number.isFinite(amount) && amount > 0 && Boolean(currencyFrom) && Boolean(currencyTo);
        if (currencyReady && !prevCurrencyReadyRef.current) {
            toast.success(`💱 Currency conversion ready — ${amount} ${currencyFrom} to ${currencyTo}`, { duration: 3000 });
        }
        prevCurrencyReadyRef.current = currencyReady;
    }, [currencyAmount, currencyFrom, currencyTo]);

    useEffect(() => {
        if (prevIsRunningRef.current && !isRunning) {
            clearAllAttachments();
        }
        prevIsRunningRef.current = isRunning;
    }, [isRunning]);

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // DISABLED — re-enable when ready to implement
    // const getImageDimensions = (file) => new Promise((resolve) => {
    //     const objectUrl = URL.createObjectURL(file);
    //     const image = new Image();
    //     image.onload = () => {
    //         resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    //         URL.revokeObjectURL(objectUrl);
    //     };
    //     image.onerror = () => {
    //         resolve({ width: 0, height: 0 });
    //         URL.revokeObjectURL(objectUrl);
    //     };
    //     image.src = objectUrl;
    // });

    const usePipeline = () => {
        if (suggestion && suggestion.agents && suggestion.agents.length > 0) {
            dispatch(clearPipeline());
            suggestion.agents.forEach(id => {
                // Verify agent exists before dispatching
                const agent = resolveAgentById(id);
                if (agent) {
                    dispatch(addToPipeline(agent.id || agent._id));
                }
            });
            toast.success(`Pipeline ready: ${suggestion.label}`);
            setSuggestion(null);
        }
    };

    const openMemoryPanel = () => {
        navigate('/memory');
    };

    // DISABLED — re-enable when ready to implement
    // const hasChartTrigger = Array.isArray(pipelineResult?.agentOutputs) && pipelineResult.agentOutputs.length > 0;

    // DISABLED — re-enable when ready to implement
    // const attachChartFromLastOutput = () => {
    //     const last = pipelineResult?.agentOutputs?.[pipelineResult.agentOutputs.length - 1];
    //     if (!last?.output) {
    //         toast.error('No recent output available for chart generation.');
    //         return;
    //     }
    //     const nextChartRequest = { fromLastOutput: true, content: last.output };
    //     setChartRequest(nextChartRequest);
    //     const points = countChartPoints(nextChartRequest);
    //     toast.success(`📊 Chart data attached — ${points} data points`, { duration: 3000 });
    // };

    const previewCurrency = async () => {
        if (!currencyAmount || !currencyFrom || !currencyTo) return;
        setCurrencyPreviewLoading(true);
        try {
            const res = await api.convertCurrency({ amount: Number(currencyAmount), from: currencyFrom, to: currencyTo });
            if (res?.success) {
                setCurrencyPreview(`${res.amount} ${res.from} = ${Number(res.converted).toFixed(2)} ${res.to} (rate ${res.rate})`);
            } else {
                setCurrencyPreview('Conversion preview unavailable');
            }
        } catch {
            setCurrencyPreview('Conversion preview unavailable');
        } finally {
            setCurrencyPreviewLoading(false);
        }
    };

    let executeButtonClass =
        'flex-1 h-[48px] text-13 font-bold tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-200 ';

    if (!isExecutable) {
        executeButtonClass += 'bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed rounded-lg overflow-hidden ';
    } else {
        executeButtonClass += 'glass-button-primary rounded-lg overflow-hidden ';
    }

    // DISABLED — re-enable when ready to implement
    // const datasetRows = parseDatasetRowCount(attachedData);
    // const chartPoints = countChartPoints(chartRequest);
    const currencyReady = Number.isFinite(Number(currencyAmount)) && Number(currencyAmount) > 0 && Boolean(currencyFrom) && Boolean(currencyTo);

    const showAttachmentStrip =
        pdfUploadStatus === 'processing' ||
        pdfUploadStatus === 'ready' ||
        pdfUploadStatus === 'error' ||
        // DISABLED — re-enable when ready to implement
        // imageUploadStatus === 'processing' ||
        // imageUploadStatus === 'ready' ||
        // imageUploadStatus === 'error' ||
        // Boolean(attachedCode.trim()) ||
        // Boolean(attachedData.trim()) ||
        currencyReady;
        // || Boolean(chartRequest);

    const attachmentChips = [];

    if (pdfUploadStatus === 'processing') {
        attachmentChips.push(
            <div key="pdf-processing" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-blue-400/25 bg-blue-400/10 text-blue-300 min-h-[40px]">
                <span className="w-4 h-4 border-2 border-blue-300/40 border-t-blue-300 rounded-full animate-spin" />
                <span className="text-11">{truncateLabel(attachedPDFName || 'PDF', 20)} Processing...</span>
            </div>
        );
    }

    if (pdfUploadStatus === 'error') {
        attachmentChips.push(
            <div key="pdf-error" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-red-400/35 bg-red-500/10 text-red-300 min-h-[40px]">
                <span className="text-13">📄</span>
                <span className="text-11">Upload failed — try again</span>
                <button type="button" onClick={() => clearAttachmentByType('pdf')} className="ml-1 text-11 hover:text-white" aria-label="Remove PDF attachment">✕</button>
            </div>
        );
    }

    if (pdfUploadStatus === 'ready' && attachedPDF) {
        attachmentChips.push(
            <div key="pdf-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-blue-400/25 bg-blue-400/10 text-blue-200 min-h-[40px]">
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
                <span className="text-13">📄</span>
                <span className="text-11">{truncateLabel(attachedPDFName, 20)} ({attachedPDFSizeKb} KB)</span>
                <button type="button" onClick={() => clearAttachmentByType('pdf')} className="ml-1 text-11 hover:text-white" aria-label="Remove PDF attachment">✕</button>
            </div>
        );
    }

    // DISABLED — re-enable when ready to implement
    // if (imageUploadStatus === 'processing') {
    //     attachmentChips.push(
    //         <div key="image-processing" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-pink-400/25 bg-pink-400/10 text-pink-300 min-h-[40px]">
    //             <span className="w-4 h-4 border-2 border-pink-300/40 border-t-pink-300 rounded-full animate-spin" />
    //             <span className="text-11">{truncateLabel(attachedImageName || 'Image', 20)} Processing...</span>
    //         </div>
    //     );
    // }

    // DISABLED — re-enable when ready to implement
    // if (imageUploadStatus === 'error') {
    //     attachmentChips.push(
    //         <div key="image-error" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-red-400/35 bg-red-500/10 text-red-300 min-h-[40px]">
    //             <span className="text-13">🖼️</span>
    //             <span className="text-11">Upload failed — try again</span>
    //             <button type="button" onClick={() => clearAttachmentByType('image')} className="ml-1 text-11 hover:text-white" aria-label="Remove image attachment">✕</button>
    //         </div>
    //     );
    // }

    // DISABLED — re-enable when ready to implement
    // if (imageUploadStatus === 'ready' && attachedImage) {
    //     attachmentChips.push(
    //         <div key="image-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-pink-400/25 bg-pink-400/10 text-pink-200 min-h-[40px]">
    //             <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
    //             <img src={attachedImage} alt="Attached preview" className="w-10 h-10 rounded object-cover border border-pink-300/30" />
    //             <span className="text-11">{truncateLabel(attachedImageName, 20)}</span>
    //             <button type="button" onClick={() => clearAttachmentByType('image')} className="ml-1 text-11 hover:text-white" aria-label="Remove image attachment">✕</button>
    //         </div>
    //     );
    // }

    // DISABLED — re-enable when ready to implement
    // if (attachedCode.trim()) {
    //     attachmentChips.push(
    //         <div key="code-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-200 min-h-[40px]">
    //             <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
    //             <span className="text-13">⚙️</span>
    //             <span className="text-11">{CODE_LANGUAGE_LABELS[codeLanguage] || 'Code'}</span>
    //             <button type="button" onClick={() => clearAttachmentByType('code')} className="ml-1 text-11 hover:text-white" aria-label="Remove code attachment">✕</button>
    //         </div>
    //     );
    // }

    // DISABLED — re-enable when ready to implement
    // if (attachedData.trim()) {
    //     attachmentChips.push(
    //         <div key="data-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-indigo-400/25 bg-indigo-400/10 text-indigo-200 min-h-[40px]">
    //             <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
    //             <span className="text-13">🗄️</span>
    //             <span className="text-11">Dataset ({datasetRows} rows)</span>
    //             <button type="button" onClick={() => clearAttachmentByType('data')} className="ml-1 text-11 hover:text-white" aria-label="Remove dataset attachment">✕</button>
    //         </div>
    //     );
    // }

    if (currencyReady) {
        attachmentChips.push(
            <div key="currency-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 min-h-[40px]">
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
                <span className="text-13">💱</span>
                <span className="text-11">{currencyFrom} → {currencyTo}</span>
                <button type="button" onClick={() => clearAttachmentByType('currency')} className="ml-1 text-11 hover:text-white" aria-label="Remove currency attachment">✕</button>
            </div>
        );
    }

    // DISABLED — re-enable when ready to implement
    // if (chartRequest) {
    //     attachmentChips.push(
    //         <div key="chart-ready" className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 min-h-[40px]">
    //             <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
    //             <span className="text-13">📊</span>
    //             <span className="text-11">Chart data ready</span>
    //             <button type="button" onClick={() => clearAttachmentByType('chart')} className="ml-1 text-11 hover:text-white" aria-label="Remove chart attachment">✕</button>
    //         </div>
    //     );
    // }

    return (
        <div className="glass-card w-full flex flex-col shrink-0">
            {/* Header */}
            <div className="h-[40px] flex items-center px-5 border-b border-[var(--border-subtle)]">
                <span className="section-label m-0">
                    <Translate>MISSION INPUT</Translate>
                </span>
            </div>

            {/* Input Section */}
            <div className="p-[16px]">
                <div className="glass-input rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent-cyan/50 focus-within:border-accent-cyan/50 transition-all duration-300">
                    <textarea
                        value={taskGoal}
                        onChange={(e) => dispatch(setTaskGoal(e.target.value))}
                        disabled={isRunning}
                        placeholder={localizedPlaceholder}
                        className="w-full min-h-[120px] 2xl:min-h-[160px] bg-transparent border-none outline-none resize-none text-14 leading-relaxed text-[var(--text-primary)] p-4 placeholder-[var(--text-muted)] disabled:opacity-50"
                    />
                </div>

                {userPreferences?.showEmailField && (
                    <div className="mt-3">
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => dispatch(setRecipientEmail(e.target.value))}
                            placeholder="Optional recipient email"
                            className="w-full h-[42px] bg-transparent border border-[var(--border-default)] rounded-lg px-3 text-13 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-accent-cyan"
                        />
                        {recipientEmail.trim() === '' && (
                            <p className="mt-1 text-11 text-[var(--text-muted)]">
                                {notificationSettings?.emailAddress
                                    ? `Results will be sent to ${notificationSettings.emailAddress}`
                                    : 'Add a default email in Settings to enable auto-delivery.'}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-3 border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--glass-bg)]/30">
                    <p className="text-11 text-[var(--text-muted)] uppercase tracking-wider mb-2">Attach Tools</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => pdfInputRef.current?.click()} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">📄 PDF</button>
                        {/* DISABLED — re-enable when ready to implement */}
                        {/* <button type="button" onClick={() => imageInputRef.current?.click()} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">🖼️ Image</button> */}
                        {/* <button type="button" onClick={() => setShowCodeModal((v) => !v)} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">⚙️ Code</button>
                        <button type="button" onClick={() => setShowDataModal((v) => !v)} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">🗄️ Data</button> */}
                        <button type="button" onClick={() => setShowCurrencyInline((v) => !v)} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">💱 Currency</button>
                        {/* {hasChartTrigger && (
                            <button type="button" onClick={attachChartFromLastOutput} className="text-11 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] hover:border-white/20">📊 Chart</button>
                        )} */}
                    </div>

                    <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setAttachedPDFName(file.name);
                            setAttachedPDFSizeKb(toKilobytes(file.size));
                            setPdfUploadStatus('processing');
                            try {
                                const b64 = await fileToBase64(file);
                                setAttachedPDF(b64);
                                setPdfUploadStatus('ready');
                                toast.success(`📄 ${file.name} attached — ready for pipeline`, { duration: 3000 });
                            } catch {
                                setAttachedPDF('');
                                setPdfUploadStatus('error');
                            } finally {
                                e.target.value = '';
                            }
                        }}
                    />
                    {/* DISABLED — re-enable when ready to implement */}
                    {/* <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setAttachedImageName(file.name);
                            setImageUploadStatus('processing');
                            try {
                                const [b64, dimensions] = await Promise.all([
                                    fileToBase64(file),
                                    getImageDimensions(file),
                                ]);
                                setAttachedImage(b64);
                                setAttachedImageMeta({
                                    filename: file.name,
                                    width: Number(dimensions?.width || 0),
                                    height: Number(dimensions?.height || 0),
                                    filesizeKb: toKilobytes(file.size),
                                });
                                setImageUploadStatus('ready');
                                toast.success(`🖼️ ${file.name} attached — ready for analysis`, { duration: 3000 });
                            } catch {
                                setAttachedImage('');
                                setAttachedImageMeta(null);
                                setImageUploadStatus('error');
                            } finally {
                                e.target.value = '';
                            }
                        }}
                    /> */}

                    {showAttachmentStrip && (
                        <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--glass-bg)]/40 p-2.5">
                            <div className="flex flex-wrap gap-2">{attachmentChips}</div>
                        </div>
                    )}

                    {/* DISABLED — re-enable when ready to implement */}
                    {/* {showCodeModal && (
                        <div className="mt-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--glass-bg)]/50">
                            <div className="flex gap-2 mb-2">
                                <select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)} className="h-8 px-2 rounded bg-transparent border border-[var(--border-subtle)] text-12">
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="bash">Bash</option>
                                </select>
                            </div>
                            <textarea
                                value={attachedCode}
                                onChange={(e) => setAttachedCode(e.target.value)}
                                placeholder="Paste code snippet"
                                className="w-full min-h-[90px] p-2 rounded bg-transparent border border-[var(--border-subtle)] text-12 font-mono"
                            />
                        </div>
                    )} */}

                    {/* DISABLED — re-enable when ready to implement */}
                    {/* {showDataModal && (
                        <div className="mt-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--glass-bg)]/50">
                            <textarea
                                value={attachedData}
                                onChange={(e) => setAttachedData(e.target.value)}
                                placeholder="Paste JSON or CSV data"
                                className="w-full min-h-[90px] p-2 rounded bg-transparent border border-[var(--border-subtle)] text-12 font-mono"
                            />
                        </div>
                    )} */}

                    {showCurrencyInline && (
                        <div className="mt-2 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <input value={currencyAmount} onChange={(e) => setCurrencyAmount(e.target.value)} placeholder="Amount" className="h-8 px-2 rounded bg-transparent border border-[var(--border-subtle)] text-12" />
                                <input value={currencyFrom} onChange={(e) => setCurrencyFrom(e.target.value.toUpperCase())} placeholder="From" className="h-8 px-2 rounded bg-transparent border border-[var(--border-subtle)] text-12" />
                                <input value={currencyTo} onChange={(e) => setCurrencyTo(e.target.value.toUpperCase())} placeholder="To" className="h-8 px-2 rounded bg-transparent border border-[var(--border-subtle)] text-12" />
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={previewCurrency} className="h-7 px-2 rounded border border-[var(--border-subtle)] text-11">Preview</button>
                                <span className="text-11 text-[var(--text-muted)]">{currencyPreviewLoading ? 'Loading...' : currencyPreview}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Suggestion Banner */}
                {userPreferences?.showPipelineRecommendations && suggestion && suggestion.agents.length > 0 && (
                    <div className="mt-3 p-3 bg-accent-cyan/5 border border-accent-cyan/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-18">✨</span>
                                <p className="text-12 text-accent-cyan font-medium">
                                    <span className="opacity-70">{recommendedText}</span> {translatedSuggestionLabel || suggestion.label}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-accent-cyan/30 text-accent-cyan/80">
                                    {Math.round(Number(suggestion.confidence || 0) * 100)}% {matchText}
                                </span>
                            </div>
                            {pipeline.length > 0 && (
                                <p className="text-[11px] text-[var(--text-secondary)] ml-0 sm:ml-7">
                                    {replacePredictionNotice}
                                </p>
                            )}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 ml-0 sm:ml-7">
                                {suggestion.agents.map((id, index) => {
                                    const agent = resolveAgentById(id);
                                    if (!agent) return null;
                                    // Arrow color logic: use previous agent color or fallback
                                    const prevAgentId = index > 0 ? suggestion.agents[index - 1] : null;
                                    const prevAgent = prevAgentId ? resolveAgentById(prevAgentId) : null;
                                    const arrowColor = prevAgent ? prevAgent.color : 'currentColor';

                                    return (
                                        <div key={`${id}-${index}`} className="flex items-center">
                                            {index > 0 && (
                                                <span 
                                                    className="mx-1 text-[14px]" 
                                                    style={{ color: arrowColor, opacity: 0.6 }}
                                                >
                                                    →
                                                </span>
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <div
                                                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-transform hover:scale-105"
                                                    title={agent.name}
                                                    style={{
                                                        backgroundColor: `${agent.color}26`, // ~15% opacity
                                                        border: `1px solid ${agent.color}80`, // ~50% opacity
                                                        color: agent.color,
                                                        boxShadow: `0 0 10px ${agent.color}1A`
                                                    }}
                                                >
                                                    {agent.name.charAt(0)}
                                                </div>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                                    {agent.name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                onClick={openMemoryPanel}
                                className="text-11 font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] px-3 py-1.5 rounded border border-[var(--border-subtle)] transition-all whitespace-nowrap"
                            >
                                {openMemoryPanelText}
                            </button>
                            <button
                                onClick={usePipeline}
                                className="text-11 font-bold uppercase tracking-wider text-accent-cyan hover:bg-accent-cyan/10 px-3 py-1.5 rounded border border-accent-cyan/30 transition-all whitespace-nowrap"
                            >
                                {pipeline.length > 0 ? replacePredictionText : useThisPipelineText}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Row */}
            <div className="px-[16px] pb-[16px] flex items-center gap-3">
                <button
                    type="button"
                    disabled={!userPreferences?.showPipelineRecommendations || taskGoal.trim().length < 8 || isRunning}
                    onClick={runPipelinePrediction}
                    className="h-[48px] px-4 text-11 font-bold tracking-widest uppercase rounded-lg border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title={predictPipelineTitleText}
                >
                    {predictPipelineText}
                </button>

                <button
                    disabled={!isExecutable}
                    onClick={onExecute}
                    className={executeButtonClass}
                >
                    {!agentsHydrated ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-30" />
                                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" className="opacity-90" />
                            </svg>
                            <span><Translate>Loading agents</Translate></span>
                        </>
                    ) : isRunning ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <Translate>RUNNING</Translate>
                        </>
                    ) : (
                        <>
                            <span>▶</span>
                            <Translate>EXECUTE PIPELINE</Translate>
                        </>
                    )}
                </button>

                <button
                    onClick={() => dispatch(clearLogs())}
                    className="glass-button-secondary w-28 h-[48px] flex items-center justify-center gap-2 text-13 font-semibold uppercase tracking-widest text-red-500 hover:text-red-400 border border-[var(--border-default)] hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                    ✕ <Translate>Clear</Translate>
                </button>

                <button
                    type="button"
                    onClick={clearAllAttachments}
                    className="glass-button-secondary w-32 h-[48px] flex items-center justify-center gap-2 text-12 font-semibold uppercase tracking-widest text-[var(--text-muted)]"
                >
                    {clearAttachText}
                </button>
            </div>
        </div>
    );
}
