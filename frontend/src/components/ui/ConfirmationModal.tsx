import { X } from "lucide-react";
import { Button } from "./button";

interface ConfirmationModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
    readonly title: string;
    readonly message: string;
    readonly confirmText?: string;
    readonly cancelText?: string;
    readonly isDestructive?: boolean;
    readonly isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false,
    isLoading = false,
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                role="button"
                tabIndex={0}
                aria-label="Cerrar modal"
            />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        onKeyDown={(e) => e.key === 'Enter' && onClose()}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isLoading}
                        aria-label="Cerrar"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <p className="text-gray-600 mb-6">{message}</p>
                
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={
                            isDestructive 
                                ? "bg-red-600 hover:bg-red-700" 
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }
                    >
                        {isLoading ? "Procesando..." : confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}