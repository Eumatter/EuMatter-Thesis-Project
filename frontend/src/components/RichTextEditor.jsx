import React from 'react'

const RichTextEditor = ({ value, onChange, placeholder = 'Type here...', className = '' }) => {
    const containerRef = React.useRef(null)
    const quillRef = React.useRef(null)

    React.useEffect(() => {
        if (!containerRef.current || quillRef.current || !window.Quill) return
        const toolbarOptions = [
            [{ header: [false, 1, 2, 3] }],
            ['bold', 'italic', 'underline', 'link'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }]
        ]
        quillRef.current = new window.Quill(containerRef.current, {
            theme: 'snow',
            placeholder,
            modules: { toolbar: toolbarOptions }
        })
        if (value) {
            quillRef.current.root.innerHTML = value
        }
        const handler = () => {
            onChange?.(quillRef.current.root.innerHTML)
        }
        quillRef.current.on('text-change', handler)
        return () => {
            if (quillRef.current) {
                quillRef.current.off('text-change', handler)
            }
        }
    }, [placeholder])

    React.useEffect(() => {
        if (!containerRef.current) return
        const toolbarEl = containerRef.current.querySelector('.ql-toolbar')
        const containerEl = containerRef.current.querySelector('.ql-container')
        const editorEl = containerRef.current.querySelector('.ql-editor')
        if (toolbarEl) {
            toolbarEl.style.border = 'none'
            toolbarEl.style.background = 'transparent'
            toolbarEl.classList.add('px-3', 'py-2')
        }
        if (containerEl) {
            containerEl.style.border = 'none'
            containerEl.classList.add('border-0', 'shadow-none')
        }
        if (editorEl) {
            editorEl.classList.add('min-h-[140px]', 'px-1', 'text-gray-900')
        }
    }, [])

    React.useEffect(() => {
        if (!quillRef.current) return
        const currentHtml = quillRef.current.root.innerHTML
        const nextHtml = value || ''
        if (currentHtml !== nextHtml) {
            quillRef.current.root.innerHTML = nextHtml
        }
    }, [value])

    return (
        <div className={`rounded-xl border-2 border-gray-200 bg-white/60 focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/20 transition-all duration-200 ${className}`}>
            <div ref={containerRef} className="min-h-[160px]" />
        </div>
    )
}

export default RichTextEditor


