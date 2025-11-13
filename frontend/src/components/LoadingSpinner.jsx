import React from 'react';
import { RotatingLines } from 'react-loader-spinner';

/**
 * Standardized Loading Spinner Component
 * Uses RotatingLines spinner from react-loader-spinner for consistency across the system
 * 
 * @param {Object} props
 * @param {string} props.color - Color of the spinner (default: '#800000' - maroon)
 * @param {string} props.size - Size of the spinner ('small', 'medium', 'large', 'tiny', or number) (default: '50')
 * @param {string} props.text - Optional text to display below the spinner
 * @param {boolean} props.fullScreen - Whether to show spinner in full screen overlay (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.strokeWidth - Width of the spinner lines (default: '5')
 * @param {boolean} props.inline - Whether to display spinner inline (no flex column, for buttons) (default: false)
 */
const LoadingSpinner = ({ 
    color = '#800000', 
    size = '50',
    text = null,
    fullScreen = false,
    className = '',
    strokeWidth = '5',
    inline = false
}) => {
    // Convert size prop to number if it's a string
    const getSize = () => {
        if (typeof size === 'number') return size;
        switch (size) {
            case 'tiny':
                return 16;
            case 'small':
                return 30;
            case 'medium':
                return 50;
            case 'large':
                return 80;
            default:
                return 50;
        }
    };

    // Adjust stroke width based on size for better visibility
    const getStrokeWidth = () => {
        if (strokeWidth !== '5') return strokeWidth;
        if (size === 'tiny') return '3';
        if (size === 'small') return '4';
        return '5';
    };

    const spinnerSize = getSize();
    const actualStrokeWidth = getStrokeWidth();

    // Inline mode for buttons
    if (inline) {
        // Calculate wrapper size to accommodate spinner with background
        const wrapperSize = spinnerSize + 6;
        return (
            <span 
                className={`inline-flex items-center justify-center relative ${className}`}
                style={{ 
                    width: `${wrapperSize}px`, 
                    height: `${wrapperSize}px`,
                    minWidth: `${wrapperSize}px`,
                    minHeight: `${wrapperSize}px`
                }}
            >
                {/* White background circle for visibility on dark buttons */}
                <span 
                    className="absolute rounded-full bg-white/90"
                    style={{ 
                        width: `${spinnerSize + 4}px`, 
                        height: `${spinnerSize + 4}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 0
                    }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>
                    <RotatingLines
                        strokeColor={color}
                        strokeWidth={actualStrokeWidth}
                        animationDuration="0.75"
                        width={spinnerSize.toString()}
                        visible={true}
                    />
                </span>
            </span>
        );
    }

    const spinnerContent = (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <RotatingLines
                strokeColor={color}
                strokeWidth={actualStrokeWidth}
                animationDuration="0.75"
                width={spinnerSize.toString()}
                visible={true}
            />
            {text && (
                <p className="mt-4 text-gray-600 font-medium animate-pulse">{text}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
};

export default LoadingSpinner;

