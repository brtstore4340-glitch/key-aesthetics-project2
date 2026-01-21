import { cn } from "@/lib/utils";
import { Upload, X, FileText } from "lucide-react";
import React, { useRef, useState } from "react";

export default function GlassUpload({ label, onUpload, value, className, ...props }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Create a fake local URL for preview or read as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (onUpload) {
          onUpload(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
    if (onUpload) onUpload(null);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative group cursor-pointer flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 transition-all duration-300",
        value ? "border-primary/50 bg-primary/5" : "",
        className
      )}
    >
      <input
        type="file"
        className="hidden"
        ref={inputRef}
        onChange={handleChange}
        {...props}
      />
      
      {value ? (
        <div className="relative w-full h-full flex flex-col items-center">
             {typeof value === 'string' && value.startsWith('data:image') ? (
                 <img src={value} alt="Preview" className="max-h-32 rounded-lg mb-2 object-contain" />
             ) : (
                <FileText className="w-10 h-10 text-primary mb-2" />
             )}
             <p className="text-sm text-white/80 truncate max-w-[200px]">{fileName || "File selected"}</p>
             <button 
                onClick={handleClear}
                className="absolute -top-2 -right-2 p-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors"
             >
                <X className="w-4 h-4" />
             </button>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-300 mb-4">
            <Upload className="w-6 h-6 text-white/60 group-hover:text-primary" />
          </div>
          <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">
            {label || "Upload File"}
          </span>
        </>
      )}
    </div>
  );
}
