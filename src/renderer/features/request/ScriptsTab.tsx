import { Box, Typography } from '@mui/material'
import { useCallback } from 'react'
import CodeEditor from '../../components/CodeEditor'
import { useRequestEditor } from '../../contexts/RequestEditorContext'

export default function ScriptsTab() {
  const { request, patch } = useRequestEditor()

  const patchPreRequest = useCallback(
    (preRequestScript: string) => patch({ preRequestScript }),
    [patch]
  )
  const patchTestScript = useCallback((testScript: string) => patch({ testScript }), [patch])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Pre-request Script
        </Typography>
        <CodeEditor
          height="150px"
          language="javascript"
          value={request.preRequestScript}
          onChange={patchPreRequest}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Tests
        </Typography>
        <CodeEditor
          height="150px"
          language="javascript"
          value={request.testScript}
          onChange={patchTestScript}
        />
      </Box>
    </Box>
  )
}
