import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { memo, useCallback } from 'react'
import CodeEditor from '../../components/CodeEditor'
import { useRequestEditorActions, useRequestField } from '../../contexts/RequestEditorContext'
import { COMPACT } from '../../theme/compact'

const PM_API = [
  'alert(message) · confirm(message)',
  'console.log / warn / error',
  'pm.environment.set/get/unset',
  'pm.collectionVariables.set/get/unset',
  'pm.request.url / .method / .body',
  'pm.response.json() / .text()',
  'pm.test(name, fn) · pm.expect(x).to.equal(y)'
]

const PreRequestEditor = memo(function PreRequestEditor() {
  const { patch } = useRequestEditorActions()
  const requestId = useRequestField('id')
  const value = useRequestField('preRequestScript')
  const onChange = useCallback((preRequestScript: string) => patch({ preRequestScript }), [patch])

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', height: '100%' }}>
      <Box
        sx={{
          px: 0.75,
          py: 0.375,
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>Pre-request</Typography>
        <Typography sx={COMPACT.caption}>Runs before send</Typography>
      </Box>
      <Box sx={{ p: 0.5 }}>
        <CodeEditor
          editorKey={`${requestId}-pre`}
          height="130px"
          language="javascript"
          value={value}
          onChange={onChange}
        />
      </Box>
    </Paper>
  )
})

const TestScriptEditor = memo(function TestScriptEditor() {
  const { patch } = useRequestEditorActions()
  const requestId = useRequestField('id')
  const value = useRequestField('testScript')
  const onChange = useCallback((testScript: string) => patch({ testScript }), [patch])

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', height: '100%' }}>
      <Box
        sx={{
          px: 0.75,
          py: 0.375,
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>Tests</Typography>
        <Typography sx={COMPACT.caption}>Runs after response</Typography>
      </Box>
      <Box sx={{ p: 0.5 }}>
        <CodeEditor
          editorKey={`${requestId}-test`}
          height="130px"
          language="javascript"
          value={value}
          onChange={onChange}
        />
      </Box>
    </Paper>
  )
})

export default function ScriptsTab() {
  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 0.75
        }}
      >
        <PreRequestEditor />
        <TestScriptEditor />
      </Box>

      <Accordion
        disableGutters
        elevation={0}
        sx={{
          mt: 0.75,
          border: 1,
          borderColor: 'divider',
          borderRadius: '6px !important',
          '&:before': { display: 'none' },
          '& .MuiAccordionSummary-root': { minHeight: 32, py: 0 },
          '& .MuiAccordionSummary-content': { my: 0.5 }
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}>
          <Typography sx={{ fontSize: 11, fontWeight: 600 }}>pm.* API reference</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 0.75 }}>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2,
              fontFamily: 'Consolas, monospace',
              fontSize: 10,
              color: 'text.secondary',
              lineHeight: 1.4,
              '& li': { mb: 0.25 }
            }}
          >
            {PM_API.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}
