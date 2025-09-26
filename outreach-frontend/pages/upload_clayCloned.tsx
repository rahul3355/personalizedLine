import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload as UploadIcon, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Download
} from 'lucide-react';

// Import the assets
import geometricStack from '../assets/geometric-stack.png';
import scatteredShapes from '../assets/scattered-shapes.png';

// Types
interface File {
  name: string;
  size: number;
  type: string;
}

interface UploadState {
  files: File[];
  uploading: boolean;
  processing: boolean;
  uploadProgress: number;
  currentStep: number;
  error?: string;
}

// Mock APIs for demo
const mockUploadAPI = async (file: File, onProgress: (progress: number) => void): Promise<void> => {
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress(i);
  }
};

const mockProcessAPI = async (files: File[], onProgress: (progress: number) => void): Promise<void> => {
  for (let i = 0; i <= 100; i += 5) {
    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress(i);
  }
};

const Upload = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>({
    files: [],
    uploading: false,
    processing: false,
    uploadProgress: 0,
    currentStep: 1,
  });

  const [isDragActive, setIsDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // File upload handlers
  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const newFiles = droppedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      setState(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const newFiles = selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      setState(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  }, []);

  const uploadFiles = async () => {
    if (state.files.length === 0) return;

    setIsUploading(true);
    setState(prev => ({ ...prev, uploading: true, uploadProgress: 0 }));

    try {
      for (const file of state.files) {
        await mockUploadAPI(file, (progress) => {
          setState(prev => ({ ...prev, uploadProgress: progress }));
        });
      }

      toast({
        title: "Files uploaded successfully!",
        description: `${state.files.length} file(s) uploaded.`,
      });

      setState(prev => ({ ...prev, uploading: false, currentStep: 2 }));
      
      // Start processing
      setTimeout(() => {
        processFiles();
      }, 1000);

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, uploading: false }));
    } finally {
      setIsUploading(false);
    }
  };

  const processFiles = async () => {
    setState(prev => ({ ...prev, processing: true }));
    
    try {
      await mockProcessAPI(state.files, (progress) => {
        setProgress(progress);
      });

      setState(prev => ({ ...prev, processing: false, currentStep: 3 }));
      
      toast({
        title: "Processing complete!",
        description: "Your files are ready.",
      });

    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, processing: false }));
    }
  };

  const handleNext = () => {
    if (state.currentStep === 1) {
      uploadFiles();
    } else if (state.currentStep === 2) {
      // Processing is automatic
    } else if (state.currentStep === 3) {
      // Final step - redirect or reset
      resetUpload();
    }
  };

  const handlePrevious = () => {
    if (state.currentStep > 1 && !state.uploading && !state.processing) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const resetUpload = () => {
    setState({
      files: [],
      uploading: false,
      processing: false,
      uploadProgress: 0,
      currentStep: 1,
    });
    setProgress(0);
    setIsUploading(false);
  };

  const steps = [
    { id: 1, title: "Upload" },
    { id: 2, title: "Process" },
    { id: 3, title: "Complete" }
  ];

  const { files, uploading, processing, uploadProgress, currentStep } = state;

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorative 3D Elements */}
      <motion.div 
        className="absolute top-20 left-20 w-24 h-24 opacity-90"
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 2, 0],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <img src={geometricStack} alt="Geometric shapes" className="w-full h-full object-contain" />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-32 right-16 w-20 h-20 opacity-80"
        animate={{ 
          y: [0, 8, 0],
          rotate: [0, -3, 0],
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <img src={scatteredShapes} alt="Scattered shapes" className="w-full h-full object-contain" />
      </motion.div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Go to market with unique data<br />
            <span className="text-gray-900">— and the ability to act on it</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Bring AI agents, enrichment, and intent data together<br />
            and turn insights into relevant, timely action.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          className="flex justify-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center space-x-6 bg-gray-50 rounded-2xl px-10 py-6 border border-gray-100">
            {steps.map((step, index) => (
              <motion.div 
                key={step.id} 
                className="flex items-center"
                whileHover={{ scale: 1.02 }}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${currentStep >= index + 1 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'bg-white text-gray-400 border border-gray-200'
                  }
                `}>
                  {currentStep > index + 1 ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium transition-colors duration-300 ${
                  currentStep >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 mx-6" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-white border-gray-200 shadow-lg overflow-hidden">
            <div className="p-8 md:p-12">
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.6 }}
                      className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center"
                    >
                      <UploadIcon className="w-10 h-10 text-gray-600" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Upload Your Document</h2>
                    <p className="text-gray-600 text-lg">
                      Drag and drop your files or click to browse
                    </p>
                  </div>

                  <div
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    className={`
                      border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
                      relative overflow-hidden
                      ${isDragActive 
                        ? 'border-gray-400 bg-gray-50 transform scale-[1.02]' 
                        : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={onFileSelect}
                      className="hidden"
                    />
                    <motion.div
                      animate={{ 
                        scale: isDragActive ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadIcon className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${
                        isDragActive ? 'text-gray-700' : 'text-gray-500'
                      }`} />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {isDragActive ? 'Drop files here' : 'Choose files to upload'}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        or drag and drop them here
                      </p>
                      <Button 
                        type="button" 
                        className="bg-gray-900 hover:bg-gray-800 text-white border-0 shadow-sm transition-all duration-300"
                      >
                        Browse Files
                      </Button>
                    </motion.div>
                  </div>

                  {files.length > 0 && (
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <h4 className="font-semibold text-gray-900">Selected Files:</h4>
                      {files.map((file, index) => (
                        <motion.div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <motion.div 
                  className="space-y-8"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-center">
                    <motion.div
                      className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-6 h-6 text-gray-600" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Processing Your Files</h2>
                    <p className="text-gray-600 text-lg">
                      Please wait while we analyze your documents...
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-medium text-gray-900">Overall Progress</span>
                        <Badge className="bg-gray-900 text-white border-0">
                          {progress}%
                        </Badge>
                      </div>
                      
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gray-900"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: FileText, label: "Document Analysis", status: "complete" },
                        { icon: Loader2, label: "Content Extraction", status: "processing" },
                        { icon: CheckCircle, label: "Quality Check", status: "pending" },
                        { icon: Download, label: "Finalizing", status: "pending" }
                      ].map((step, index) => (
                        <motion.div
                          key={step.label}
                          className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.2 }}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.status === 'complete' 
                              ? 'bg-green-500' 
                              : step.status === 'processing'
                              ? 'bg-gray-900'
                              : 'bg-gray-300'
                          }`}>
                            <step.icon className={`w-4 h-4 ${
                              step.status === 'processing' ? 'animate-spin' : ''
                            } text-white`} />
                          </div>
                          <span className="text-gray-900 font-medium">{step.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div 
                  className="space-y-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-center">
                    <motion.div
                      className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-2xl flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.6 }}
                    >
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Upload Complete!</h2>
                    <p className="text-gray-600 text-lg">
                      Your documents have been successfully processed and are ready to use.
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">Processing Summary</h3>
                        <ul className="space-y-1 text-green-800">
                          <li>✓ {files.length} file{files.length !== 1 ? 's' : ''} uploaded successfully</li>
                          <li>✓ Content extracted and analyzed</li>
                          <li>✓ Quality checks passed</li>
                          <li>✓ Ready for use in your workflow</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-8 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isUploading}
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && files.length === 0}
                  className="bg-gray-900 hover:bg-gray-800 text-white border-0 shadow-sm transition-all duration-300"
                >
                  {currentStep === 1 ? (
                    <>
                      Upload Files
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : currentStep === 2 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Start Building for Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Upload;