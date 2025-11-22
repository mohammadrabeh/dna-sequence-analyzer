import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Menu, X, Upload, FileText, Download, Globe, Plus, Eye } from 'lucide-react';

// Language translations
const translations = {
  ar: {
    title: 'محلل التسلسل الجيني',
    uploadFile: 'رفع ملف',
    pasteSequence: 'أو الصق التسلسل هنا',
    analyzeNow: 'حلّل الآن',
    analyzing: 'جاري التحليل...',
    results: 'النتائج',
    totalLength: 'الطول الكلي',
    baseCount: 'عدد القواعد',
    gcContent: 'نسبة GC',
    atContent: 'نسبة AT',
    baseDistribution: 'توزيع القواعد النيتروجينية',
    percentageComparison: 'مقارنة النسب المئوية',
    gcWindow: 'محتوى GC عبر التسلسل',
    downloadCSV: 'تحميل CSV',
    howToUse: 'كيفية الاستخدام',
    contactUs: 'تواصل معنا',
    closeSidebar: 'إغلاق القائمة',
    openSidebar: 'فتح القائمة',
    dragDrop: 'اسحب وأفلت الملف هنا',
    supportedFormats: 'الصيغ المدعومة: .txt, .fasta, .fa, .seq',
    invalidChars: 'تحذير: تم تجاهل الأحرف غير الصالحة',
    noData: 'الرجاء إدخال تسلسل DNA للتحليل',
    autoDetect: 'كشف اللغة تلقائياً',
    position: 'الموقع',
    newAnalysis: 'تحليل جديد',
    showInput: 'عرض الإدخال',
    resultsHistory: 'سجل النتائج',
    analysisNumber: 'التحليل رقم'
  },
  en: {
    title: 'DNA Sequence Analyzer',
    uploadFile: 'Upload File',
    pasteSequence: 'Or paste sequence here',
    analyzeNow: 'Analyze Now',
    analyzing: 'Analyzing...',
    results: 'Results',
    totalLength: 'Total Length',
    baseCount: 'Base Count',
    gcContent: 'GC Content',
    atContent: 'AT Content',
    baseDistribution: 'Base Distribution',
    percentageComparison: 'Percentage Comparison',
    gcWindow: 'GC Content Across Sequence',
    downloadCSV: 'Download CSV',
    howToUse: 'How to Use',
    contactUs: 'Contact Us',
    closeSidebar: 'Close Sidebar',
    openSidebar: 'Open Sidebar',
    dragDrop: 'Drag and drop file here',
    supportedFormats: 'Supported formats: .txt, .fasta, .fa, .seq',
    invalidChars: 'Warning: Invalid characters ignored',
    noData: 'Please enter a DNA sequence to analyze',
    autoDetect: 'Auto-detect Language',
    position: 'Position',
    newAnalysis: 'New Analysis',
    showInput: 'Show Input',
    resultsHistory: 'Results History',
    analysisNumber: 'Analysis #'
  }
};

const DNAAnalyzer = () => {
  const [language, setLanguage] = useState('ar');
  const [autoDetectLang, setAutoDetectLang] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sequence, setSequence] = useState('');
  const [fileName, setFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [invalidChars, setInvalidChars] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showInputSection, setShowInputSection] = useState(false);
  const [resultsHistory, setResultsHistory] = useState([]);
  const fileInputRef = useRef(null);
  const cancelAnalysisRef = useRef(false);

  const t = translations[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    if (autoDetectLang) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ar')) {
        setLanguage('ar');
      } else {
        setLanguage('en');
      }
    }
  }, [autoDetectLang]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const analyzeDNASequence = async (sequence) => {
    return new Promise((resolve) => {
      const cleanSeq = sequence.toUpperCase().replace(/[^ACGT]/g, '');
      const counts = { A: 0, C: 0, G: 0, T: 0 };
      const chunkSize = 10000;
      let currentIndex = 0;

      const processChunk = () => {
        if (cancelAnalysisRef.current) {
          resolve(null);
          return;
        }

        const end = Math.min(currentIndex + chunkSize, cleanSeq.length);
        
        for (let i = currentIndex; i < end; i++) {
          const base = cleanSeq[i];
          if (counts[base] !== undefined) counts[base]++;
        }

        currentIndex = end;
        const progressPercent = (currentIndex / cleanSeq.length) * 100;
        setProgress(progressPercent);

        if (currentIndex < cleanSeq.length) {
          setTimeout(processChunk, 0);
        } else {
          const total = cleanSeq.length;
          const gc = counts.G + counts.C;
          const at = counts.A + counts.T;
          const gcPercent = total > 0 ? (gc / total) * 100 : 0;
          const atPercent = total > 0 ? (at / total) * 100 : 0;

          const windowSize = 100;
          const gcWindows = [];
          for (let i = 0; i < cleanSeq.length - windowSize; i += windowSize) {
            const window = cleanSeq.slice(i, i + windowSize);
            let windowGC = 0;
            for (let j = 0; j < window.length; j++) {
              if (window[j] === 'G' || window[j] === 'C') windowGC++;
            }
            gcWindows.push({
              position: i + windowSize / 2,
              gc: (windowGC / windowSize) * 100
            });
          }

          resolve({
            counts,
            total,
            gcPercent,
            atPercent,
            gcWindows,
            cleanSeq
          });
        }
      };

      processChunk();
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        processSequence(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        processSequence(text);
      };
      reader.readAsText(file);
    }
  };

  const processSequence = (text) => {
    let cleanText = text.replace(/^>.*$/gm, '');
    cleanText = cleanText.replace(/\s+/g, '');
    
    const hasInvalid = /[^ACGTacgt]/.test(cleanText);
    setInvalidChars(hasInvalid);
    
    setSequence(cleanText);
  };

  const analyzeSequence = async () => {
    if (!sequence.trim()) {
      alert(t.noData);
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);
    setProgress(0);
    cancelAnalysisRef.current = false;

    await new Promise(resolve => setTimeout(resolve, 100));

    const analysisResults = await analyzeDNASequence(sequence);

    if (analysisResults && !cancelAnalysisRef.current) {
      const newResult = {
        ...analysisResults,
        id: Date.now(),
        timestamp: new Date().toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US'),
        fileName: fileName || null
      };
      
      setResults(newResult);
      setResultsHistory(prev => [newResult, ...prev]);
      setProgress(100);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResults(true);
      }, 500);
    } else {
      setIsAnalyzing(false);
    }
  };

  const startNewAnalysis = () => {
    setShowResults(false);
    setResults(null);
    setSequence('');
    setFileName('');
    setInvalidChars(false);
    setShowInputSection(false);
  };

  const loadHistoryResult = (result) => {
    setResults(result);
    setShowResults(true);
    setSidebarOpen(false);
  };

  const downloadCSV = () => {
    if (!results) return;
    
    const csv = `Base,Count,Percentage\nA,${results.counts.A},${((results.counts.A / results.total) * 100).toFixed(2)}%\nC,${results.counts.C},${((results.counts.C / results.total) * 100).toFixed(2)}%\nG,${results.counts.G},${((results.counts.G / results.total) * 100).toFixed(2)}%\nT,${results.counts.T},${((results.counts.T / results.total) * 100).toFixed(2)}%\n\nGC Content,${results.gcPercent.toFixed(2)}%\nAT Content,${results.atPercent.toFixed(2)}%\nTotal Length,${results.total}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dna_analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#A855F7'];

  const barData = results ? [
    { name: 'A', value: results.counts.A, fill: COLORS[0] },
    { name: 'C', value: results.counts.C, fill: COLORS[1] },
    { name: 'G', value: results.counts.G, fill: COLORS[2] },
    { name: 'T', value: results.counts.T, fill: COLORS[3] }
  ] : [];

  const pieData = results ? [
    { name: 'GC', value: results.gcPercent, fill: COLORS[1] },
    { name: 'AT', value: results.atPercent, fill: COLORS[0] }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={sidebarOpen ? t.closeSidebar : t.openSidebar}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {t.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={autoDetectLang}
                onChange={(e) => setAutoDetectLang(e.target.checked)}
                className="rounded"
              />
              <Globe size={14} />
            </label>
            <button
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1 rounded-lg transition-all font-medium text-sm ${language === 'ar' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              🇮🇶 AR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg transition-all font-medium text-sm ${language === 'en' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
        </div>
        <nav className="p-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              alert(t.howToUse + '\n\n1. ' + t.uploadFile + '\n2. ' + t.pasteSequence + '\n3. ' + t.analyzeNow);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors mb-2"
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          >
            <FileText size={20} className="text-blue-600" />
            <span className="text-gray-700">{t.howToUse}</span>
          </button>
          <a
            href="https://cgmr.online/contact-us"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors mb-4"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-700">{t.contactUs}</span>
          </a>

          {resultsHistory.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-bold text-gray-800 mb-3">{t.resultsHistory}</h3>
              <div className="space-y-2">
                {resultsHistory.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => loadHistoryResult(result)}
                    className="w-full text-right p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <div className="font-medium text-gray-800">
                      {t.analysisNumber} {resultsHistory.length - index}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {result.timestamp}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t.totalLength}: {result.total.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showResults && !isAnalyzing && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowInputSection(!showInputSection)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium"
            >
              <Eye size={18} />
              {t.showInput}
            </button>
            <button
              onClick={startNewAnalysis}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md font-medium"
            >
              <Plus size={18} />
              {t.newAnalysis}
            </button>
          </div>
        )}

        {(!showResults || showInputSection) && !isAnalyzing && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <div
              className={`border-3 border-dashed rounded-xl p-8 mb-6 transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">{t.dragDrop}</p>
                <p className="text-sm text-gray-500 mb-4">{t.supportedFormats}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.fasta,.fa,.seq"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  {t.uploadFile}
                </button>
                {fileName && (
                  <p className="mt-3 text-sm text-green-600 font-medium">✓ {fileName}</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">{t.pasteSequence}</label>
              <textarea
                value={sequence}
                onChange={(e) => processSequence(e.target.value)}
                className="w-full h-40 p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-mono text-sm resize-none"
                placeholder="ATCGATCGATCG..."
                dir="ltr"
              />
              {invalidChars && (
                <p className="mt-2 text-sm text-orange-600">⚠️ {t.invalidChars}</p>
              )}
            </div>

            <button
              onClick={analyzeSequence}
              disabled={!sequence.trim()}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.analyzeNow}
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <div className="space-y-3">
              <p className="text-center text-gray-700 font-medium">{t.analyzing}</p>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {showResults && results && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded"></span>
                {t.results}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">{t.totalLength}</p>
                  <p className="text-2xl font-bold text-blue-600">{results.total.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">{t.gcContent}</p>
                  <p className="text-2xl font-bold text-green-600">{results.gcPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
                  <p className="text-sm text-gray-600 mb-1">{t.atContent}</p>
                  <p className="text-2xl font-bold text-red-600">{results.atPercent.toFixed(2)}%</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">{t.baseCount}</p>
                  <p className="text-sm font-bold text-purple-600">
                    A:{results.counts.A} C:{results.counts.C}<br/>
                    G:{results.counts.G} T:{results.counts.T}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Download size={18} />
                  {t.downloadCSV}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{t.baseDistribution}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{t.percentageComparison}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {results.gcWindows.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{t.gcWindow}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.gcWindows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="position" label={{ value: t.position, position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'GC %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="gc" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">BY: MOHAMMAD RABEH</p>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DNAAnalyzer;
