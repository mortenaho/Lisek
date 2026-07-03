import { TextField } from '@mui/material'
import Editor from '@monaco-editor/react'
import { memo, useCallback } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string
  minRows?: number
  editorKey?: string
}

function FallbackEditor({
  value,
  onChange,
  height = '200px',
  minRows = 10
}: Pick<Props, 'value' | 'onChange' | 'height' | 'minRows'>) {
  return (
    <TextField
      multiline
      fullWidth
      minRows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      sx={{
        '& .MuiInputBase-root': {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: 13,
          alignItems: 'flex-start',
          py: 1
        },
        '& textarea': {
          minHeight: height,
          lineHeight: 1.5
        }
      }}
    />
  )
}

function CodeEditor({
  value,
  onChange,
  language = 'json',
  height = '200px',
  minRows = 10,
  editorKey
}: Props) {
  const handleChange = useCallback((v: string | undefined) => onChange(v || ''), [onChange])

  return (
    <Editor
      key={editorKey}
      height={height}
      language={language}
      value={value}
      onChange={handleChange}
      loading={<FallbackEditor value={value} onChange={onChange} height={height} minRows={minRows} />}
      options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
    />
  )
}

export default memo(CodeEditor)
