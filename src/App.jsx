import React, { useState, useMemo } from 'react';
import {
    Calculator,
    Users,
    DollarSign,
    TrendingUp,
    AlertCircle,
    Plus,
    Trash2,
    Save,
    RotateCcw,
    FileText,
    Copy,
    Check,
    X,
    Calendar,
    ArrowRight,
    HelpCircle,
    PlayCircle,
    ClipboardCheck,
    ChevronRight,
    ExternalLink,
    Info
} from 'lucide-react';

// --- Constants & Defaults ---

const EXPENSE_CATEGORIES = [
    "Advertising",
    "Auto and Truck Expenses",
    "Bank Service Charges",
    "Business Licenses and Permits",
    "Computer and Internet Expenses",
    "Fuel Expense",
    "Insurance Expense",
    "Interest Expense",
    "Meals and Entertainment",
    "Office Supplies and Software",
    "Payroll Expenses (Taxes/Benefits)", // Special handling for this key
    "Postage",
    "Professional Fees",
    "Rent Expense",
    "Shop Supplies",
    "Taxes Paid to Illinois",
    "Telephone Expense",
    "Tools and Small Equipment",
    "Travel",
    "Uncategorized Expenses",
    "Utilities"
];

const PAYROLL_CATEGORY_KEY = "Payroll Expenses (Taxes/Benefits)";

const DEFAULT_EMPLOYEES = [
    { id: 1, name: "Adam Wallraf", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 2, name: "Ashton Miller", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 3, name: "Chad", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 4, name: "Dominic Witting", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 5, name: "Emma Miller", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 6, name: "Isaac Miller", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 7, name: "Maycee J Miller", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 8, name: "Padilla Manuel", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
    { id: 9, name: "Rhyse Gutche", directHours: 0, indirectHours: 0, directWages: 0, indirectWages: 0 },
];

const INITIAL_EXPENSES = EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
}, {});

// --- Helper Functions ---

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
    }).format(value);
};

const formatPercent = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value);
};

// --- Wizard Component ---
const WizardOverlay = ({ isOpen, onClose, onImport, employeeList }) => {
    const [step, setStep] = useState(1);
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    // Wizard Logic
    const steps = [
        { title: "General Expenses", type: "expenses" },
        { title: "Employee Labor", type: "labor" },
        { title: "Review & Finish", type: "review" }
    ];

    const currentStep = steps[step - 1];

    let promptText = "";
    let instructions = [];

    if (currentStep.type === 'expenses') {
        instructions = [
            "Log in to QuickBooks Online.",
            "Go to Reports > Profit and Loss.",
            "Select the dates you want the report for.",
            "Click Export then Export to CSV.",
            "Copy the prompt below and enter it into Google Gemini along with your CSV file."
        ];

        // Construct a sample object string to show the AI exactly what we want
        const targetExample = {
            dateRange: "Example Date Range",
            expenses: {
                "Advertising": 500.00,
                "Fuel Expense": 1200.50,
                "Payroll Expenses (Taxes/Benefits)": 85000.00,
                "NEW CATEGORY FOUND": 150.00
            }
        };

        promptText = `I have a QuickBooks Profit & Loss CSV export. Extract the expenses into a JSON object following these STRICT rules:

1.  **Date Range:** Find the report date range in the header (e.g., "January 1-November 25, 2025") and set it as "dateRange".
2.  **Scope:** Focus ONLY on the section between "Expenses" and "Total for Expenses".
3.  **Extraction Logic (Crucial):**
    * For simple rows (e.g., "Advertising", "Fuel Expense"), use the value from the Total column.
    * **Grouped Expenses:** If you see a main category like "Payroll Expenses" followed by sub-rows (Wages, Taxes) and then a "Total for Payroll Expenses" row, you MUST use the value from the **"Total for..."** row. Ignore the individual sub-rows to avoid duplicates.
    * **New Categories:** If you find an expense category that is NOT in my list below, include it exactly as written in the CSV.
4.  **Mapping:** Map the CSV names to the following Standard Keys if they match closely. If "Total for Payroll Expenses" is found, map it to "Payroll Expenses (Taxes/Benefits)".
    * Standard Keys: ${JSON.stringify(EXPENSE_CATEGORIES)}
5.  **Cleaning:** Remove '$', ',', and quotes. Ensure values are Numbers.
6.  **Output:** Return a SINGLE valid JSON object.

Target JSON Structure:
${JSON.stringify(targetExample, null, 2)}

Here is my CSV Data:
[PASTE CSV CONTENT HERE]`;

    } else if (currentStep.type === 'labor') {
        instructions = [
            "Go to your Time Tracking / Payroll software (e.g., QuickBooks Time).",
            "Run a detailed time report.",
            "Select the same date range as your P&L.",
            "Export the data to CSV.",
            "Copy the prompt below and enter it into Google Gemini along with your CSV file."
        ];

        promptText = `Role: You are an expert Payroll Data Analyst. You are tasked with processing employee timesheets and calculating precise labor costs by cross-referencing timesheet data with a complex pay rate schedule.

Input Data:
1. Timesheets CSV: Contains raw time entries (Note: The actual header starts on row 18; skip the first 17 rows of metadata).
2. Pay Rates File: Contains Base Rates (Standard hourly rates + FICA) and Prevailing Wage (PW) Rates.

Your Task:
Process every row in the timesheet to categorize the labor type and calculate the specific cost for that entry based on the rules below.

Step 1: Data Cleaning & Setup
- Load Timesheets: Ignore the top 17 summary rows. Use the header row starting with Name, Date, Working on, etc. Filter out "Report totals:".
- Load Rates: Clean all currency columns.
- Name Matching: Ensure timesheet names match pay rate names.

Step 2: Categorize Labor (Row-by-Row)
For every time entry, assign a Category:
- Indirect Labor: If "Working on" contains "General".
- Direct Labor: If "Working on" is ANYTHING else, apply sub-logic:
  -- Drive Time: If Note contains "Drive Time" or "DT".
  -- Prevailing Wage: If Note contains "P.W." or "prevailing wage". Action: Extract county name (e.g., "Cook").
  -- Other Direct: If none of the above apply.

Step 3: Determine the Hourly Cost
Calculate the Fully Burdened Cost for each entry:
- Standard Rate: Use employee's "Total Pay" from Base Rates (Base + FICA).
- Prevailing Wage (PW) Rate: Look up extracted county in PW Rates. Formula: (PW Total Regular Hourly Rate) + (PW Base Hourly Rate * 0.0765). If county missing, default to Standard Rate.
Application Rules:
- Indirect Labor, Drive Time, Other Direct: Use Standard Rate.
- Prevailing Wage Labor: Use calculated PW Rate.

Step 4: Output Requirements
Generate a JSON Array of objects summing up the totals for each employee.
Structure:
[
  { 
    "name": "Employee Name", 
    "directHours": (Sum of all Direct Labor hours, including Drive Time & PW), 
    "indirectHours": (Sum of all Indirect Labor hours), 
    "directWages": (Sum of Total Cost for all Direct Labor entries), 
    "indirectWages": (Sum of Total Cost for all Indirect Labor entries) 
  },
  ...
]

My Existing Employee List (for reference/matching):
${JSON.stringify(employeeList.map(e => e.name))}

Here is my Data (Timesheets and Pay Rates):
[PASTE BOTH DATA SETS HERE]`;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNext = () => {
        if (currentStep.type === 'review') {
            onClose(); // Finished
            return;
        }

        if (!jsonInput.trim()) {
            setError("Please paste the AI response before continuing, or click Skip if you have no data.");
            return;
        }

        try {
            const cleanJson = jsonInput.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            onImport(parsed, currentStep.type);
            setJsonInput('');
            setError(null);
            setStep(step + 1);
        } catch (e) {
            setError("Invalid JSON format. Please check your paste.");
        }
    };

    const handleSkip = () => {
        setJsonInput('');
        setError(null);
        setStep(step + 1);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Step {step} of 3</span>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1">{currentStep.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {currentStep.type === 'review' ? (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">You're All Set!</h3>
                            <p className="text-slate-600 max-w-md mx-auto">
                                Your data has been successfully imported. You can now view the detailed report or make manual adjustments in the Data Entry tab.
                            </p>
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={onClose}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    View My Report <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Instructions */}
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <div className="flex gap-4 items-start">
                                    <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 mt-1">
                                        <PlayCircle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-blue-900 text-lg mb-3">Follow these steps:</h4>
                                        <ol className="list-decimal pl-5 space-y-2 text-blue-800 text-sm font-medium">
                                            {instructions.map((inst, i) => (
                                                <li key={i}>{inst}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Left: Prompt */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex justify-between items-center">
                                        1. Get the Prompt
                                    </label>

                                    <button
                                        onClick={handleCopy}
                                        className={`w-full py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${copied ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 text-blue-700'}`}
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        <span className="font-bold">{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                                    </button>

                                    <div className="relative">
                                        <textarea
                                            readOnly
                                            value={promptText}
                                            className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-500 resize-none focus:outline-none"
                                        />
                                        <div className="absolute top-2 right-2 text-[10px] text-slate-400 bg-slate-100 px-2 rounded pointer-events-none">
                                            Manual Copy Box
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Input */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">2. Paste AI Result</label>
                                    <textarea
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        placeholder='Paste the JSON response from Gemini here...'
                                        className="w-full h-[270px] p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono text-xs shadow-sm"
                                    />
                                    {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {currentStep.type !== 'review' && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between">
                        <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 text-sm font-medium px-4">
                            Skip this step
                        </button>
                        <button
                            onClick={handleNext}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 flex items-center gap-2"
                        >
                            {step === 2 ? 'Finish & Review' : 'Next Step'} <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Modal Component (For Manual/One-off Imports) ---
const ImportModal = ({ isOpen, onClose, onImport, type, employeeList }) => {
    // ... (keeping existing modal logic for the manual button in data entry tab)
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    let promptText = "";
    let title = "";

    if (type === 'expenses') {
        title = "Import General Expenses";
        const targetExample = {
            dateRange: "Example Date Range",
            expenses: {
                "Advertising": 500.00,
                "Fuel Expense": 1200.50,
                "Payroll Expenses (Taxes/Benefits)": 85000.00,
                "NEW CATEGORY FOUND": 150.00
            }
        };

        promptText = `I have a QuickBooks Profit & Loss CSV export. Extract the expenses into a JSON object following these STRICT rules:

1.  **Date Range:** Find the report date range in the header (e.g., "January 1-November 25, 2025") and set it as "dateRange".
2.  **Scope:** Focus ONLY on the section between "Expenses" and "Total for Expenses".
3.  **Extraction Logic (Crucial):**
    * For simple rows (e.g., "Advertising", "Fuel Expense"), use the value from the Total column.
    * **Grouped Expenses:** If you see a main category like "Payroll Expenses" followed by sub-rows (Wages, Taxes) and then a "Total for Payroll Expenses" row, you MUST use the value from the **"Total for..."** row. Ignore the individual sub-rows to avoid duplicates.
    * **New Categories:** If you find an expense category that is NOT in my list below, include it exactly as written in the CSV.
4.  **Mapping:** Map the CSV names to the following Standard Keys if they match closely. If "Total for Payroll Expenses" is found, map it to "Payroll Expenses (Taxes/Benefits)".
    * Standard Keys: ${JSON.stringify(EXPENSE_CATEGORIES)}
5.  **Cleaning:** Remove '$', ',', and quotes. Ensure values are Numbers.
6.  **Output:** Return a SINGLE valid JSON object.

Target JSON Structure:
${JSON.stringify(targetExample, null, 2)}

Here is my CSV Data:
[PASTE CSV CONTENT HERE]`;
    } else if (type === 'labor') {
        title = "Import Employee Labor Data";
        promptText = `Role: You are an expert Payroll Data Analyst. You are tasked with processing employee timesheets and calculating precise labor costs by cross-referencing timesheet data with a complex pay rate schedule.

Input Data:
1. Timesheets CSV: Contains raw time entries (Note: The actual header starts on row 18; skip the first 17 rows of metadata).
2. Pay Rates File: Contains Base Rates (Standard hourly rates + FICA) and Prevailing Wage (PW) Rates.

Your Task:
Process every row in the timesheet to categorize the labor type and calculate the specific cost for that entry based on the rules below.

Step 1: Data Cleaning & Setup
- Load Timesheets: Ignore the top 17 summary rows. Use the header row starting with Name, Date, Working on, etc. Filter out "Report totals:".
- Load Rates: Clean all currency columns.
- Name Matching: Ensure timesheet names match pay rate names.

Step 2: Categorize Labor (Row-by-Row)
For every time entry, assign a Category:
- Indirect Labor: If "Working on" contains "General".
- Direct Labor: If "Working on" is ANYTHING else, apply sub-logic:
  -- Drive Time: If Note contains "Drive Time" or "DT".
  -- Prevailing Wage: If Note contains "P.W." or "prevailing wage". Action: Extract county name (e.g., "Cook").
  -- Other Direct: If none of the above apply.

Step 3: Determine the Hourly Cost
Calculate the Fully Burdened Cost for each entry:
- Standard Rate: Use employee's "Total Pay" from Base Rates (Base + FICA).
- Prevailing Wage (PW) Rate: Look up extracted county in PW Rates. Formula: (PW Total Regular Hourly Rate) + (PW Base Hourly Rate * 0.0765). If county missing, default to Standard Rate.
Application Rules:
- Indirect Labor, Drive Time, Other Direct: Use Standard Rate.
- Prevailing Wage Labor: Use calculated PW Rate.

Step 4: Output Requirements
Generate a JSON Array of objects summing up the totals for each employee.
Structure:
[
  { 
    "name": "Employee Name", 
    "directHours": (Sum of all Direct Labor hours, including Drive Time & PW), 
    "indirectHours": (Sum of all Indirect Labor hours), 
    "directWages": (Sum of Total Cost for all Direct Labor entries), 
    "indirectWages": (Sum of Total Cost for all Indirect Labor entries) 
  },
  ...
]

My Existing Employee List (for reference/matching):
${JSON.stringify(employeeList.map(e => e.name))}

Here is my Data (Timesheets and Pay Rates):
[PASTE BOTH DATA SETS HERE]`;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApply = () => {
        try {
            const cleanJson = jsonInput.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            onImport(parsed, type);
            onClose();
            setJsonInput('');
            setError(null);
        } catch (e) {
            setError("Invalid JSON format. Please ensure you pasted the AI response correctly.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Step 1: Copy AI Prompt</h4>
                            <button
                                onClick={handleCopy}
                                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy Prompt'}
                            </button>
                        </div>
                        <div className="bg-slate-100 p-3 rounded-md text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap border border-slate-200 max-h-32">
                            {promptText}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                        <strong>Step 2:</strong> Go to your AI tool (ChatGPT, Claude, etc.). Paste the prompt above, then paste your data file contents right after it.
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Step 3: Paste AI Response (JSON)</h4>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='Paste the JSON here...'
                            className="w-full h-40 p-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {error && (
                            <p className="text-red-500 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {error}
                            </p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium">Cancel</button>
                    <button onClick={handleApply} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-medium shadow-md">Apply Data</button>
                </div>
            </div>
        </div>
    );
};

// --- Workflow Guide Component ---
const WorkflowGuide = ({ onStart, onStartWizard }) => (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <PlayCircle className="w-12 h-12 text-blue-600 ml-1" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Welcome to your Cost Calculator
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                Let's determine your true hourly labor costs. We will import your QuickBooks overhead and employee timesheets in a few simple steps.
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-4">
                <button
                    onClick={onStartWizard}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-200 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                    Start Step-by-Step Wizard <ArrowRight className="w-5 h-5" />
                </button>

                <button
                    onClick={onStart}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                    Skip to Manual Entry <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
                <div className="flex gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg h-fit text-slate-500"><FileText className="w-5 h-5" /></div>
                    <div>
                        <h4 className="font-bold text-slate-800">1. Expenses</h4>
                        <p className="text-sm text-slate-500">Import P&L from QuickBooks to calculate overhead.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg h-fit text-slate-500"><Users className="w-5 h-5" /></div>
                    <div>
                        <h4 className="font-bold text-slate-800">2. Labor</h4>
                        <p className="text-sm text-slate-500">Import hours & wages to verify efficiency.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg h-fit text-slate-500"><ClipboardCheck className="w-5 h-5" /></div>
                    <div>
                        <h4 className="font-bold text-slate-800">3. Results</h4>
                        <p className="text-sm text-slate-500">See your true break-even cost per employee.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default function App() {
    // --- State ---
    const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
    const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES);
    const [dateRange, setDateRange] = useState('');
    const [activeTab, setActiveTab] = useState('guide'); // 'guide', 'input', 'report'
    const [importModal, setImportModal] = useState({ isOpen: false, type: 'expenses' });
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // --- Handlers ---

    const handleExpenseChange = (category, value) => {
        const numValue = parseFloat(value) || 0;
        setExpenses(prev => ({ ...prev, [category]: numValue }));
    };

    const handleImport = (importedData, type) => {
        if (type === 'expenses') {
            // Handle Date Range
            if (importedData.dateRange) {
                setDateRange(importedData.dateRange);
            }

            // Handle Expenses
            let expenseData = importedData.expenses || importedData;

            // FAIL-SAFE: If the AI returns an array of objects (like the user example) 
            // instead of a clean object, detect it and convert it.
            if (Array.isArray(expenseData)) {
                const expenseObject = {};
                expenseData.forEach(item => {
                    // Check for keys like 'category' (from user example) or 'name', and 'amount' or 'value'
                    const key = item.category || item.name || item.account;
                    const val = item.amount || item.value || 0;
                    if (key) expenseObject[key] = val;
                });
                expenseData = expenseObject;
            }

            setExpenses(prev => {
                // This logic now supports merging NEW keys that aren't in the default list
                const newExpenses = { ...prev, ...expenseData };

                // Ensure all values are numbers
                Object.keys(newExpenses).forEach(key => {
                    newExpenses[key] = parseFloat(newExpenses[key]) || 0;
                });

                return newExpenses;
            });

            // Do not show alert in wizard mode to keep flow smooth
            if (!isWizardOpen) alert("Expenses and dates imported successfully!");

        } else if (type === 'labor') {
            // Handle Labor Import
            const newEmployeeData = importedData;
            if (!Array.isArray(newEmployeeData)) {
                alert("Error: Imported labor data must be an array.");
                return;
            }

            const updatedEmployees = [...employees];
            let matchCount = 0;

            newEmployeeData.forEach(importedEmp => {
                // Try to find existing employee by name (fuzzy match handled by AI, strict match here)
                const existingIndex = updatedEmployees.findIndex(e =>
                    e.name.toLowerCase().trim() === importedEmp.name.toLowerCase().trim()
                );

                if (existingIndex >= 0) {
                    // Update existing
                    updatedEmployees[existingIndex] = {
                        ...updatedEmployees[existingIndex],
                        directHours: importedEmp.directHours || 0,
                        indirectHours: importedEmp.indirectHours || 0,
                        directWages: importedEmp.directWages || 0,
                        indirectWages: importedEmp.indirectWages || 0
                    };
                    matchCount++;
                } else {
                    // Add new employee
                    const newId = Math.max(...updatedEmployees.map(e => e.id), 0) + 1;
                    updatedEmployees.push({
                        id: newId,
                        name: importedEmp.name,
                        directHours: importedEmp.directHours || 0,
                        indirectHours: importedEmp.indirectHours || 0,
                        directWages: importedEmp.directWages || 0,
                        indirectWages: importedEmp.indirectWages || 0
                    });
                }
            });

            setEmployees(updatedEmployees);
            if (!isWizardOpen) alert(`Labor data imported! Updated ${matchCount} existing employees and added ${newEmployeeData.length - matchCount} new ones.`);
        }
    };

    const handleEmployeeChange = (id, field, value) => {
        const numValue = parseFloat(value) || 0;
        setEmployees(prev => prev.map(emp =>
            emp.id === id ? { ...emp, [field]: numValue } : emp
        ));
    };

    const addEmployee = () => {
        const newId = Math.max(...employees.map(e => e.id), 0) + 1;
        setEmployees([...employees, {
            id: newId,
            name: "New Employee",
            directHours: 0,
            indirectHours: 0,
            directWages: 0,
            indirectWages: 0
        }]);
    };

    const removeEmployee = (id) => {
        if (confirm("Are you sure you want to remove this employee row?")) {
            setEmployees(employees.filter(e => e.id !== id));
        }
    };

    const updateEmployeeName = (id, newName) => {
        setEmployees(prev => prev.map(emp =>
            emp.id === id ? { ...emp, name: newName } : emp
        ));
    };

    const resetData = () => {
        if (confirm("Reset all data to zero?")) {
            setExpenses(INITIAL_EXPENSES);
            setEmployees(DEFAULT_EMPLOYEES);
            setDateRange('');
        }
    };

    const handleWizardClose = () => {
        setIsWizardOpen(false);
        setActiveTab('report'); // Default to report after wizard
    };

    // --- Calculations ---

    const calculations = useMemo(() => {
        // 1. Sum all values (Raw Total)
        const rawTotalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);

        // 2. Get Payroll Expense Amount
        const payrollExpenseAmount = expenses[PAYROLL_CATEGORY_KEY] || 0;

        // 3. Calculate Adjusted Fixed Overhead (Raw - Payroll)
        const totalFixedOverhead = rawTotalExpenses - payrollExpenseAmount;

        // 4. Calculate Labor Totals
        let totalDirectHours = 0;
        let totalIndirectWages = 0;

        employees.forEach(emp => {
            totalDirectHours += emp.directHours;
            totalIndirectWages += emp.indirectWages;
        });

        // 5. Total Overhead Pool (Fixed Adjusted + Indirect Wages)
        const totalOverheadPool = totalFixedOverhead + totalIndirectWages;

        const overheadCostPerDirectHour = totalDirectHours > 0
            ? totalOverheadPool / totalDirectHours
            : 0;

        const employeeMetrics = employees.map(emp => {
            const totalHours = emp.directHours + emp.indirectHours;
            const utilization = totalHours > 0 ? emp.directHours / totalHours : 0;
            const avgDirectHourlyWage = emp.directHours > 0
                ? emp.directWages / emp.directHours
                : 0;
            const trueHourlyCost = avgDirectHourlyWage + overheadCostPerDirectHour;

            return {
                ...emp,
                utilization,
                avgDirectHourlyWage,
                trueHourlyCost
            };
        });

        return {
            rawTotalExpenses,
            payrollExpenseAmount,
            totalFixedOverhead,
            totalIndirectWages,
            totalOverheadPool,
            totalDirectHours,
            overheadCostPerDirectHour,
            employeeMetrics
        };
    }, [expenses, employees]);

    // --- Memoize the expense list to handle dynamic keys ---
    const allExpenseKeys = useMemo(() => {
        // Start with default keys to preserve order
        const keys = [...EXPENSE_CATEGORIES];
        // Add any new keys found in the state that aren't in the default list
        Object.keys(expenses).forEach(key => {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        });
        return keys;
    }, [expenses]);

    // --- UI Components ---

    return (
        <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
            <WizardOverlay
                isOpen={isWizardOpen}
                onClose={handleWizardClose}
                onImport={handleImport}
                employeeList={employees}
            />

            <ImportModal
                isOpen={importModal.isOpen}
                onClose={() => setImportModal({ ...importModal, isOpen: false })}
                onImport={handleImport}
                type={importModal.type}
                employeeList={employees}
            />

            {/* Header */}
            <header className="bg-slate-900 text-white p-6 shadow-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-blue-400" />
                            HVAC Labor Cost Calc
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">True Fully Burdened Labor Rates</p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0 items-center">
                        {dateRange && (
                            <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 mr-2">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-mono text-blue-100">{dateRange}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setActiveTab('guide')}
                            className={`px-4 py-2 text-sm rounded transition-colors ${activeTab === 'guide' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Start Here
                        </button>
                        <button
                            onClick={() => setActiveTab('input')}
                            className={`px-4 py-2 text-sm rounded transition-colors ${activeTab === 'input' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Data Entry
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            className={`px-4 py-2 text-sm rounded transition-colors ${activeTab === 'report' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Report
                        </button>
                        <button onClick={resetData} className="ml-2 text-slate-500 hover:text-red-400 p-2" title="Reset All">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6">

                {/* --- GUIDE / HOME VIEW --- */}
                {activeTab === 'guide' && (
                    <WorkflowGuide
                        onStart={() => setActiveTab('input')}
                        onStartWizard={() => setIsWizardOpen(true)}
                    />
                )}

                {/* --- INPUT VIEW --- */}
                {activeTab === 'input' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">

                        {/* Pay Period Input (Visible if manual entry needed) */}
                        <div className="lg:col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Pay Period / Date Range</label>
                                <input
                                    type="text"
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    placeholder="e.g. Oct 1 - Oct 31, 2024"
                                    className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-medium placeholder-slate-300 p-0"
                                />
                            </div>
                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 hidden md:inline-block">
                                Auto-fills on Expense Import
                            </span>
                        </div>

                        {/* LEFT COL: Overhead Expenses */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-red-500" />
                                        General Expenses
                                    </h2>
                                    <button
                                        onClick={() => setImportModal({ isOpen: true, type: 'expenses' })}
                                        className="text-xs bg-white border border-slate-300 hover:bg-blue-50 text-blue-600 px-3 py-1 rounded flex items-center gap-1 transition-colors shadow-sm"
                                    >
                                        <FileText className="w-3 h-3" /> AI Import
                                    </button>
                                </div>
                                <div className="p-4 max-h-[80vh] overflow-y-auto">
                                    <div className="space-y-3">
                                        {allExpenseKeys.map(category => {
                                            const isPayroll = category === PAYROLL_CATEGORY_KEY;
                                            // Check if it's a custom key (not in default list) for styling
                                            const isCustom = !EXPENSE_CATEGORIES.includes(category);

                                            return (
                                                <div key={category} className={`${isPayroll ? "bg-amber-50/50 border-amber-100" : isCustom ? "bg-blue-50/30 border-blue-100" : "border-transparent"} border p-2 rounded -mx-2`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className={`block text-xs font-semibold ${isPayroll ? "text-amber-700" : "text-slate-600"} ${isCustom ? "flex items-center gap-1" : ""}`}>
                                                            {category}
                                                            {isCustom && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">New</span>}
                                                        </label>
                                                        {isPayroll && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-white px-1.5 rounded border border-amber-200 shadow-sm">
                                                                Excluded from Total
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <span className={`absolute left-3 top-2 ${isPayroll ? "text-amber-400" : "text-slate-400"}`}>$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className={`w-full pl-7 pr-3 py-2 border rounded focus:ring-2 focus:outline-none transition-all text-right font-mono text-sm ${isPayroll
                                                                ? "bg-amber-50 border-amber-200 text-amber-800 focus:ring-amber-500 placeholder-amber-300/50"
                                                                : "bg-slate-50 border-slate-300 text-slate-800 focus:ring-blue-500"
                                                                }`}
                                                            value={expenses[category] || ''}
                                                            onChange={(e) => handleExpenseChange(category, e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {isPayroll && (
                                                        <p className="text-[10px] text-amber-600/80 mt-1 italic">
                                                            *Imported for reference, but calculated separately in employee data.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 -mx-4 -mb-4 px-4 pb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700 text-sm">Fixed Overhead (Adjusted):</span>
                                            <span className="font-bold text-lg text-slate-800">{formatCurrency(calculations.totalFixedOverhead)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                                            <span>Gross Total (QuickBooks):</span>
                                            <span>{formatCurrency(calculations.rawTotalExpenses)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COL: Employee Data */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        Employee Labor Data
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setImportModal({ isOpen: true, type: 'labor' })}
                                            className="text-xs bg-white border border-slate-300 hover:bg-blue-50 text-blue-600 px-3 py-1 rounded flex items-center gap-1 transition-colors shadow-sm"
                                        >
                                            <FileText className="w-3 h-3" /> AI Import
                                        </button>
                                        <button
                                            onClick={addEmployee}
                                            className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded flex items-center gap-1 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" /> Add Row
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full min-w-[800px]">
                                        <thead>
                                            <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                                <th className="pb-3 pl-2">Employee Name</th>
                                                <th className="pb-3 text-center w-24 bg-green-50/50 rounded-t">Direct Hrs<br /><span className="text-[10px] normal-case opacity-70">Revenue</span></th>
                                                <th className="pb-3 text-center w-32 bg-green-50/50 rounded-t">Total Direct Wages ($)<br /><span className="text-[10px] normal-case opacity-70">Gross Pay</span></th>
                                                <th className="pb-3 text-center w-24 bg-red-50/50 rounded-t">Indirect Hrs<br /><span className="text-[10px] normal-case opacity-70">Non-Rev</span></th>
                                                <th className="pb-3 text-center w-32 bg-red-50/50 rounded-t">Indirect Wages ($)<br /><span className="text-[10px] normal-case opacity-70">Overhead</span></th>
                                                <th className="pb-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employees.map(emp => (
                                                <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="text"
                                                            value={emp.name}
                                                            onChange={(e) => updateEmployeeName(emp.id, e.target.value)}
                                                            className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-700 text-sm"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={emp.directHours || ''}
                                                            onChange={(e) => handleEmployeeChange(emp.id, 'directHours', e.target.value)}
                                                            className="w-full text-center py-1 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                                            <input
                                                                type="number" min="0" step="0.01"
                                                                value={emp.directWages || ''}
                                                                onChange={(e) => handleEmployeeChange(emp.id, 'directWages', e.target.value)}
                                                                className="w-full text-right pl-4 pr-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={emp.indirectHours || ''}
                                                            onChange={(e) => handleEmployeeChange(emp.id, 'indirectHours', e.target.value)}
                                                            className="w-full text-center py-1 border border-slate-300 rounded focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm bg-red-50/30"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                                            <input
                                                                type="number" min="0" step="0.01"
                                                                value={emp.indirectWages || ''}
                                                                onChange={(e) => handleEmployeeChange(emp.id, 'indirectWages', e.target.value)}
                                                                className="w-full text-right pl-4 pr-2 py-1 border border-slate-300 rounded focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm bg-red-50/30"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <button
                                                            onClick={() => removeEmployee(emp.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Remove Row"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Quick Summary Bar */}
                            <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="text-center md:text-left flex-1 border-r border-slate-700 pr-6">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Overhead Pool Breakdown</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Fixed Overhead (No Payroll):</span>
                                            <span className="font-mono">{formatCurrency(calculations.totalFixedOverhead)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">+ Total Indirect Wages:</span>
                                            <span className="font-mono">{formatCurrency(calculations.totalIndirectWages)}</span>
                                        </div>
                                        <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between text-blue-300 font-bold">
                                            <span>= Total Overhead Pool:</span>
                                            <span>{formatCurrency(calculations.totalOverheadPool)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Direct Capacity</p>
                                    <p className="text-2xl font-bold">{formatNumber(calculations.totalDirectHours)} <span className="text-sm font-normal text-slate-400">Hours</span></p>
                                    <p className="text-xs text-slate-500">Billable Time</p>
                                </div>
                                <div className="bg-blue-600 rounded-lg p-4 px-6 text-center shadow-lg transform hover:scale-105 transition-transform cursor-pointer" onClick={() => setActiveTab('report')}>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Overhead Cost / Hr</p>
                                    <p className="text-3xl font-bold">{formatCurrency(calculations.overheadCostPerDirectHour)}</p>
                                    <div className="flex items-center justify-center gap-1 text-xs text-blue-200 mt-1">
                                        <span>View Full Report</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- REPORT VIEW --- */}
                {activeTab === 'report' && (
                    <div className="space-y-8 animate-fade-in">
                        {dateRange && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex justify-center items-center text-blue-800 font-bold">
                                Report Period: {dateRange}
                            </div>
                        )}

                        {/* 1. Executive Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Card 1: Overhead Pool */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <TrendingUp className="w-24 h-24" />
                                </div>
                                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Overhead Expenses</h3>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-slate-800">{formatCurrency(calculations.totalOverheadPool)}</span>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-slate-100 pb-1">
                                        <span className="text-slate-500">Fixed (Excl. Payroll):</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(calculations.totalFixedOverhead)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1">
                                        <span className="text-slate-500">Indirect Labor:</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(calculations.totalIndirectWages)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Capacity */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Users className="w-24 h-24" />
                                </div>
                                <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Direct Hours</h3>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-slate-800">{formatNumber(calculations.totalDirectHours)}</span>
                                    <span className="text-slate-500">hrs</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-600">
                                    This represents the revenue-generating capacity of the team for this period.
                                </p>
                            </div>

                            {/* Card 3: The Magic Number */}
                            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden border-2 border-blue-500">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <DollarSign className="w-24 h-24 text-white" />
                                </div>
                                <h3 className="text-blue-200 font-bold text-sm uppercase tracking-wider">Actual Overhead Cost</h3>
                                <div className="mt-2">
                                    <span className="text-5xl font-bold">{formatCurrency(calculations.overheadCostPerDirectHour)}</span>
                                    <span className="text-blue-300 ml-2">/ Direct Hr</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-300">
                                    Every hour of direct labor MUST cover this amount before generating profit or covering wages.
                                </p>
                            </div>
                        </div>

                        {/* 2. Employee Performance Table */}
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Employee True Cost Analysis</h3>
                                <button
                                    onClick={() => window.print()}
                                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2 print:hidden"
                                >
                                    <Save className="w-4 h-4" /> Print Report
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Employee</th>
                                            <th className="px-6 py-4 text-center">Utilization</th>
                                            <th className="px-6 py-4 text-right">Avg Direct Wage</th>
                                            <th className="px-6 py-4 text-right text-slate-400">Overhead Alloc.</th>
                                            <th className="px-6 py-4 text-right bg-blue-50 text-blue-800 border-l border-blue-100">True Hourly Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {calculations.employeeMetrics.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium text-slate-800">{emp.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${emp.utilization > 0.85 ? 'bg-green-100 text-green-700' :
                                                        emp.utilization > 0.70 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {formatPercent(emp.utilization)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    {emp.directHours > 0 ? formatCurrency(emp.avgDirectHourlyWage) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-400">
                                                    + {formatCurrency(calculations.overheadCostPerDirectHour)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold bg-blue-50/50 text-slate-800 border-l border-slate-100">
                                                    {emp.directHours > 0 ? formatCurrency(emp.trueHourlyCost) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold text-slate-700">
                                        <tr>
                                            <td className="px-6 py-4">TOTALS / AVERAGES</td>
                                            <td className="px-6 py-4 text-center">
                                                {calculations.employeeMetrics.length > 0 && formatPercent(
                                                    calculations.employeeMetrics.reduce((acc, curr) => acc + curr.utilization, 0) / calculations.employeeMetrics.length
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right"></td>
                                            <td className="px-6 py-4 text-right"></td>
                                            <td className="px-6 py-4 text-right bg-blue-50"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                            <h4 className="font-bold mb-2">How to read this report:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Utilization:</strong> Percentage of time spent on revenue-generating work. Higher is better.</li>
                                <li><strong>Avg Direct Wage:</strong> The actual hourly rate paid for direct work (Total Direct Pay / Direct Hours).</li>
                                <li><strong>Overhead Allocation:</strong> The calculated cost of running the business per hour of field work.</li>
                                <li><strong>TRUE HOURLY COST:</strong> The break-even point for this employee. You must bill the customer <em>more</em> than this amount to make a net profit.</li>
                            </ul>
                        </div>

                    </div>
                )}

            </main>
        </div>
    );
}