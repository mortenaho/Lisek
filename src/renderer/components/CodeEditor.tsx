import { TextField, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
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
          fontSize: 11,
          alignItems: 'flex-start',
          py: 0.5
        },
        '& textarea': {
          minHeight: height,
          lineHeight: 1.35
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
  const theme = useTheme()
  const handleChange = useCallback((v: string | undefined) => onChange(v || ''), [onChange])
  const monacoTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'vs'

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper'
      }}
    >
      <Editor
        key={`${editorKey ?? language}:${monacoTheme}`}
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        theme={monacoTheme}
        loading={<FallbackEditor value={value} onChange={onChange} height={height} minRows={minRows} />}
        options={{
          minimap: { enabled: false },
          fontSize: 11,
          lineHeight: 16,
          scrollBeyondLastLine: false,
          padding: { top: 4, bottom: 4 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
        }}
      />
    </Box>
  )
}

export default memo(CodeEditor)
