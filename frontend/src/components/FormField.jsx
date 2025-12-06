import React from 'react';
import { FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

/**
 * Reusable Form Field Component with Enhanced Accessibility
 * 
 * Features:
 * - Proper ARIA labels and associations
 * - Inline error messages
 * - Success states
 * - Required field indicators
 * - Consistent styling
 */
const FormField = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    success,
    required = false,
    placeholder,
    helperText,
    icon: Icon,
    disabled = false,
    className = '',
    inputClassName = '',
    ...inputProps
}) => {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;
    const fieldId = `field-${name}`;
    const errorId = `error-${name}`;
    const helperId = `helper-${name}`;

    return (
        <div className={`mb-4 ${className}`}>
            {/* Label */}
            {label && (
                <label
                    htmlFor={fieldId}
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    {label}
                    {required && (
                        <span className="text-red-500 ml-1" aria-label="required">*</span>
                    )}
                </label>
            )}

            {/* Input Container */}
            <div className="relative">
                {/* Icon */}
                {Icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <Icon className="w-5 h-5" />
                    </div>
                )}

                {/* Input Field */}
                <input
                    id={fieldId}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    aria-required={required}
                    aria-invalid={hasError}
                    aria-describedby={
                        hasError
                            ? errorId
                            : helperText
                            ? helperId
                            : undefined
                    }
                    className={`
                        w-full px-4 py-3 rounded-lg border transition-all duration-200
                        ${Icon ? 'pl-10' : ''}
                        ${hasError
                            ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                            : hasSuccess
                            ? 'border-green-500 bg-green-50 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-300 bg-white focus:ring-[#800000] focus:border-[#800000]'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                        focus:outline-none focus:ring-2
                        placeholder:text-gray-400
                        ${inputClassName}
                    `}
                    {...inputProps}
                />

                {/* Success Icon */}
                {hasSuccess && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                        <FaCheckCircle className="w-5 h-5" aria-hidden="true" />
                    </div>
                )}

                {/* Error Icon */}
                {hasError && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                        <FaExclamationCircle className="w-5 h-5" aria-hidden="true" />
                    </div>
                )}
            </div>

            {/* Helper Text */}
            {helperText && !hasError && (
                <p
                    id={helperId}
                    className="mt-1 text-sm text-gray-500"
                >
                    {helperText}
                </p>
            )}

            {/* Error Message */}
            {hasError && (
                <p
                    id={errorId}
                    role="alert"
                    className="mt-1 text-sm text-red-600 flex items-center gap-1"
                >
                    <FaExclamationCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
};

export default FormField;

