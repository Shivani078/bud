import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, Globe, Tag, Type, FileText, RefreshCw, Copy, Check, MessageSquare, Search, ChevronDown, ChevronUp } from 'lucide-react';

const ProductListingGenerator = () => {
    const [productData, setProductData] = useState({
        description: '',
        category: '',
        image: null,
        imagePreview: null
    });

    const [contentOptions, setContentOptions] = useState({
        seo: true,
        whatsapp: false,
        conversational: false,
    });
    // const [dialect, setDialect] = useState('english'); // Removed

    const [generatedListing, setGeneratedListing] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [translations, setTranslations] = useState({});
    const [translatingLanguage, setTranslatingLanguage] = useState(null);
    const [improvementInstructions, setImprovementInstructions] = useState("");
    const backendURL = import.meta.env.VITE_BACKEND_URL;

    const fileInputRef = useRef(null);
    const langDropdownRef = useRef(null);

    const indianLanguages = {
        en: 'English', as: 'Assamese', bn: 'Bengali', gu: 'Gujarati', 
        hi: 'Hindi', kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi',
        pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', ur: 'Urdu'
    };

    // const dialects = { // Removed
    //     english: 'English', // Removed
    //     hinglish: 'Hinglish', // Removed
    //     bhojpuri: 'Bhojpuri', // Removed
    //     marathi: 'Marathi', // Removed
    // }; // Removed

    const categories = [
        'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Toys',
        'Beauty & Personal Care', 'Automotive', 'Food & Beverages', 'Health',
        'Jewelry', 'Pet Supplies', 'Office Supplies', 'Music', 'Art & Crafts'
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        // Automatically trigger translation when selectedLanguage changes and it's not English
        // and not already translated.
        if (selectedLanguage && selectedLanguage !== 'en' && !translations[selectedLanguage]) {
            translateListing(selectedLanguage);
        }
    }, [selectedLanguage]);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setProductData({
                    ...productData,
                    image: file,
                    imagePreview: e.target.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const generateListing = async () => {
        if (!productData.description && !productData.image) return;
        if (Object.values(contentOptions).every(v => !v)) {
            alert("Please select at least one content option to generate.");
            return;
        }

        setIsGenerating(true);
        setGeneratedListing(null);

        const formData = new FormData();
        formData.append('description', productData.description || 'Quality product with excellent features');
        formData.append('category', productData.category || 'General');
        // formData.append('dialect', dialect); // Removed
        formData.append('content_options_str', JSON.stringify(contentOptions));
        
        if (productData.image) {
            formData.append('image', productData.image);
        }

        try {
            const response = await fetch(`${backendURL}/api/listing`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const listing = await response.json();
            setGeneratedListing(listing);
            setTranslations({}); // Reset translations for the new content

        } catch (error) {
            console.error("Error generating listing:", error);
            alert(`Failed to generate listing: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const improveListing = async () => {
        if (!generatedListing) return;

        setIsImproving(true);
        try {
            const response = await fetch(`${backendURL}/api/listing/improve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: generatedListing,
                    instructions: improvementInstructions
                }),
            });
            if (!response.ok) throw new Error((await response.json()).detail);
            const improved = await response.json();
            setGeneratedListing(improved); // Replace with the full improved content
            setTranslations({}); // Clear old translations as content has changed
            setSelectedLanguage('en'); // Reset language to English
        } catch (error) {
            console.error("Error improving listing:", error);
            alert(`Failed to improve listing: ${error.message}`);
        } finally {
            setIsImproving(false);
        }
    };
    
    const translateListing = async (languageCode) => {
        if (!generatedListing || languageCode === 'en' || translations[languageCode] || translatingLanguage) {
            return;
        }
        
        setTranslatingLanguage(languageCode);

        try {
            const response = await fetch(`${backendURL}/api/listing/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: generatedListing,
                    language: indianLanguages[languageCode]
                }),
            });
            if (!response.ok) throw new Error((await response.json()).detail);
            const translatedContent = await response.json();
            setTranslations(prev => ({ ...prev, [languageCode]: translatedContent }));
        } catch (error) {
            console.error(`Error translating to ${languageCode}:`, error);
            alert(`Failed to translate listing: ${error.message}`);
        } finally {
            setTranslatingLanguage(null);
        }
    };

    const currentListing = translations[selectedLanguage] || generatedListing;

    const copyToClipboard = (text, field) => {
        if(typeof text !== 'string') {
            text = JSON.stringify(text, null, 2);
        }
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const GeneratedContentDisplay = ({ content, title, icon: Icon, onCopy, isCopied }) => (
        <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {title}
                </h3>
                <button onClick={onCopy} className="text-blue-600 hover:text-blue-800 transition-colors">
                    {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            {content}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        🏷️ Product Listing Generator
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Create SEO-optimized product listings with AI-powered content generation
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Upload className="w-6 h-6 text-indigo-600" />
                            Input Section
                        </h2>

                        {/* Image Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Image
                            </label>
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => fileInputRef.current.click()}
                            >
                                {productData.imagePreview ? (
                                    <img
                                        src={productData.imagePreview}
                                        alt="Product preview"
                                        className="max-w-full max-h-48 mx-auto rounded-lg"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Camera className="w-12 h-12 text-gray-400 mb-2" />
                                        <p className="text-gray-500">Click to upload product image</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Product Description */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Description
                            </label>
                            <textarea
                                value={productData.description}
                                onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                                placeholder="Describe your product in detail..."
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Category Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                value={productData.category}
                                onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Content Options */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Content Options
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={contentOptions.seo} onChange={() => setContentOptions({...contentOptions, seo: !contentOptions.seo})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                    <span className="ml-2 text-gray-700">SEO Title & Description</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" checked={contentOptions.whatsapp} onChange={() => setContentOptions({...contentOptions, whatsapp: !contentOptions.whatsapp})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                    <span className="ml-2 text-gray-700">WhatsApp-Friendly Caption</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" checked={contentOptions.conversational} onChange={() => setContentOptions({...contentOptions, conversational: !contentOptions.conversational})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                    <span className="ml-2 text-gray-700">Conversational Search Phrases</span>
                                </label>
                            </div>
                        </div>

                        {/* Dialect Selection */}
                        {/* Removed */}


                        {/* Generate Button */}
                        <button
                            onClick={generateListing}
                            disabled={isGenerating || (!productData.description && !productData.image)}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Listing
                                </>
                            )}
                        </button>
                    </div>

                    {/* Output Section */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 relative">
                        {isGenerating && (
                            <div className="absolute inset-0 bg-white bg-opacity-80 flex justify-center items-center rounded-2xl z-10">
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-700">Generating your listing...</p>
                                    <p className="text-sm text-gray-500">This might take a moment.</p>
                                </div>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-600" />
                            Generated Listing
                        </h2>
                        {currentListing ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-6">
                                    {/* Language Selection for Translation */}
                                    <div className="relative inline-block" ref={langDropdownRef}>
                                        <button
                                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                            disabled={!!translatingLanguage}
                                            className="appearance-none w-full bg-white border border-gray-300 text-gray-800 pl-10 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                            <span>{indianLanguages[selectedLanguage]}</span>
                                            {translatingLanguage ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                isLangDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                        </button>
                                        {isLangDropdownOpen && (
                                            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                                {Object.entries(indianLanguages).map(([code, name]) => (
                                                    <li
                                                        key={code}
                                                        onClick={() => {
                                                            if (translatingLanguage) return;
                                                            setSelectedLanguage(code);
                                                            setIsLangDropdownOpen(false);
                                                        }}
                                                        className={`px-4 py-2 text-gray-800 hover:bg-gray-100 cursor-pointer ${selectedLanguage === code ? 'font-bold' : ''}`}
                                                    >
                                                        {name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                     <button onClick={improveListing} disabled={isImproving || !!translatingLanguage} className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50">
                                        {isImproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Improve Content
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <textarea
                                        value={improvementInstructions}
                                        onChange={(e) => setImprovementInstructions(e.target.value)}
                                        placeholder="How can I improve this? (e.g., 'Make it sound more luxurious', 'Add a call to action')"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {currentListing.seo_content && (
                                    <GeneratedContentDisplay
                                        title="SEO Content"
                                        icon={FileText}
                                        onCopy={() => copyToClipboard(
                                            `Title: ${currentListing.seo_content.title}\n\nDescription: ${currentListing.seo_content.description}\n\nTags: ${currentListing.seo_content.tags.join(', ')}\n\nKeywords: ${currentListing.seo_content.keywords.join(', ')}`,
                                            'seo'
                                        )}
                                        isCopied={copiedField === 'seo'}
                                        content={
                                            <div className="space-y-4">
                                                <p className="text-gray-700 font-medium"><strong>Title:</strong> {currentListing.seo_content.title}</p>
                                                <p className="text-gray-700 whitespace-pre-line"><strong>Description:</strong> {currentListing.seo_content.description}</p>
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">Tags:</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentListing.seo_content.tags.map(tag => <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">{tag}</span>)}
                                                    </div>
                                                </div>
                                                 <div>
                                                    <h4 className="font-semibold text-sm mb-1">Keywords:</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentListing.seo_content.keywords.map(kw => <span key={kw} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">{kw}</span>)}
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                    />
                                )}
                                {currentListing.whatsapp_content && (
                                     <GeneratedContentDisplay
                                        title="WhatsApp Content"
                                        icon={MessageSquare}
                                        onCopy={() => copyToClipboard(
                                            `Caption: ${currentListing.whatsapp_content.caption}\n\nMessage: ${currentListing.whatsapp_content.promotional_message}`,
                                            'whatsapp'
                                        )}
                                        isCopied={copiedField === 'whatsapp'}
                                        content={
                                            <div className="space-y-2">
                                                <p className="text-gray-700"><strong>Caption:</strong> {currentListing.whatsapp_content.caption}</p>
                                                <p className="text-gray-700"><strong>Message:</strong> {currentListing.whatsapp_content.promotional_message}</p>
                                            </div>
                                        }
                                    />
                                )}
                                {currentListing.conversational_content && (
                                     <GeneratedContentDisplay
                                        title="Conversational Search Phrases"
                                        icon={Search}
                                        onCopy={() => copyToClipboard(currentListing.conversational_content.search_phrases.join('\n'), 'conversational')}
                                        isCopied={copiedField === 'conversational'}
                                        content={
                                            <ul className="list-disc list-inside text-gray-700">
                                                {currentListing.conversational_content.search_phrases.map(phrase => <li key={phrase}>"{phrase}"</li>)}
                                            </ul>
                                        }
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Your generated product listing will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductListingGenerator;