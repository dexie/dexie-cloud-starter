'use client'

import { useObservable } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/navigation'
import { DXCUserInteraction, resolveText } from 'dexie-cloud-addon'
import {
  Alert,
  alpha,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { db } from './db/db'
import { ArrowBack, ArrowCircleRight, Check } from '@mui/icons-material'
import { styled } from '@mui/material/styles'

const StyledDiv = styled('div')(({ theme }) => ({
  backgroundColor: `${theme.palette.primary.light} !important`,
  '& h3': {
    marginTop: '0px',
  },
  '& form': {
    marginBottom: '20px',
  },
  '& input[type=otp], & input[type=email]': {
    borderRadius: '5px',
    fontSize: '1rem !important',
    padding: '15px 15px',
    cursor: 'pointer',
  },
  '& button': {
    borderRadius: '5px',
    fontSize: '1rem',
    border: 'none',
    padding: '10px 15px',
    cursor: 'pointer',
  },
  '& button[type=submit]': {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    marginRight: '10px',
  },
  '& > div > div': {
    border: 'none !important',
    boxShadow: `${alpha(
      theme.palette.primary.main,
      1,
    )} 0px 0px 80px 10px !important`,
  },
}))

interface Field {
  type: string
  label: string
  placeholder: string
}

export default function SignIn({
  fields,
  onSubmit,
  type,
  alerts,
}: DXCUserInteraction) {
  const [params, setParams] = useState<{ [param: string]: string }>({})
  const theme = useTheme()
  const router = useRouter()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const [success, setSuccess] = useState(false)
  const currenUser = useObservable(db.cloud.currentUser)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (
      currenUser?.userId != undefined &&
      currenUser?.userId != 'unauthorized'
    ) {
      setSuccess(true)
    }
  }, [currenUser?.userId, router])

  const signInWithGithub = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || ''

    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}`

    window.location.href = githubOAuthUrl
  }

  return (
    <StyledDiv>
      <Head>
        <title>Sign in</title>
      </Head>
      <Box
        style={{
          display: 'flex',
          backgroundColor: alpha(theme.palette.text.primary, 0.05),
          width: '100%',
          height: '100vh',
          padding: '0px',
          margin: '0px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: isSmallScreen ? '0px' : '30px',
            padding: isSmallScreen ? '0' : '0px 50px 10px 50px',
            boxShadow: isSmallScreen ? '0' : '0 11px 34px 0 rgba(0,0,0,.2)',
            minWidth: isSmallScreen ? '100vw' : '700px',
            minHeight: isSmallScreen ? '100vh' : '700px',
            justifyContent: 'center',
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Box
            style={{
              justifyContent: 'center',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <img
              src="/company-icon.png"
              alt="Dexie Starter"
              style={{
                maxWidth: '30%',
              }}
            />
          </Box>
          <Box
            style={{
              justifyContent: 'center',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {alerts.map((alert, i) => (
              <Alert
                severity={alert.type}
                sx={{
                  maxWidth: '300px',
                  margin: 'auto',
                  mt: 2,
                  borderRadius: '10px',
                }}
                key={i}
              >
                {resolveText(alert)}
              </Alert>
            ))}
            {Object.entries(
              fields as {
                [fieldName: string]: Field
              },
            ).map(([fieldName, { type, label, placeholder }], idx) => (
              <Box key={idx}>
                <h1 style={{}}>
                  {type != undefined && type == 'otp'
                    ? 'Code from email'
                    : 'Sign in with email'}
                </h1>
                <form
                  onSubmit={(ev) => {
                    onSubmit(params)
                    ev.preventDefault()
                  }}
                >
                  <TextField
                    ref={idx === 0 ? firstFieldRef : undefined}
                    autoFocus={isSmallScreen ? false : true}
                    key={type + ' ' + label + ' ' + placeholder}
                    type={type}
                    name={fieldName}
                    disabled={onSubmit == undefined || success}
                    autoComplete="on"
                    placeholder={placeholder}
                    value={params[fieldName] || ''}
                    onFocus={() => {
                      setIsFocused(true)
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsFocused(false)
                      }, 300)
                    }}
                    onInput={(ev) => {
                      const target = ev.target as HTMLInputElement
                      setParams({
                        ...params,
                        [fieldName]: valueTransformer(type, target.value),
                      })
                    }}
                    id="outlined-basic"
                    variant="outlined"
                    sx={{
                      width: '100%',
                      maxWidth: '350px',
                      '& fieldset': {
                        borderRadius: '10px',
                      },
                      '& input': {
                        fontSize: '20px',
                        marginLeft: '10px',
                      },
                    }}
                    InputProps={{
                      autoComplete:
                        type != undefined && type == 'otp'
                          ? 'one-time-code'
                          : 'email',
                      endAdornment: (
                        <InputAdornment
                          position="end"
                          onClick={() => onSubmit(params)}
                          style={{ cursor: 'pointer' }}
                        >
                          {onSubmit == undefined ? (
                            <>
                              {success ? (
                                <Check
                                  style={{
                                    width: '32px',
                                    color: theme.palette.primary.main,
                                    marginRight: '2px',
                                  }}
                                />
                              ) : (
                                <CircularProgress
                                  color={'primary'}
                                  size={24}
                                  sx={{ marginRight: '3px' }}
                                />
                              )}
                            </>
                          ) : (
                            <ArrowCircleRight
                              style={{
                                height: '32px',
                                width: '32px',
                                color: theme.palette.text.disabled,
                              }}
                            />
                          )}
                        </InputAdornment>
                      ),
                    }}
                  />
                </form>
                <Button
                  component="a"
                  onClick={signInWithGithub}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    margin: 'auto',
                    mt: '20px',
                    maxWidth: '350px',
                    display: 'flex',
                    minHeight: '40px', // motsvarar Tailwinds min-h-10 (ca 40px)
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px', // fullt rundade hörn (rounded-full)
                    border: '1px solid',
                    borderColor: 'appcolor.400', // ersätt med önskad färg
                    backgroundColor: 'appcolor.200', // ersätt med önskad färg
                    fontSize: '0.875rem', // motsvarar text-sm
                    color: 'textcolor.1000', // ersätt med önskad färg
                    transition: 'background-color 250ms ease-in-out',
                    textTransform: 'none',
                    p: '8px',
                    '&:hover': {
                      backgroundColor: 'appcolor.300', // ersätt med önskad hover-färg
                    },
                  }}
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    width="30"
                    height="30"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ marginRight: '8px' }}
                  >
                    <title>GitHub icon</title>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 0C5.372 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577
             0-.285-.011-1.04-.016-2.04-3.338.725-4.042-1.613-4.042-1.613-.546-1.386-1.333-1.755-1.333-1.755
             -1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.304 3.495.997
             .108-.775.42-1.304.762-1.604-2.665-.303-5.467-1.333-5.467-5.933 0-1.312.47-2.381 1.235-3.221
             -.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.045.138 3.003.404
             2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.234 1.909 1.234 3.221
             0 4.609-2.807 5.625-5.479 5.921.431.372.815 1.102.815 2.222 0 1.606-.015 2.899-.015 3.293
             0 .319.217.694.825.576C20.565 21.795 24 17.298 24 12
             0-6.627-5.373-12-12-12z"
                      fill="#181717"
                    />
                  </svg>
                  Log in with GitHub
                </Button>
              </Box>
            ))}

            <Box
              style={{
                color: theme.palette.text.secondary,
                marginTop: '25px',
                textAlign: 'center',
                fontStyle: 'italic',
                fontSize: '12px',
              }}
            >
              {type != undefined && type == 'otp'
                ? 'We just sent you a temporary login code!'
                : 'Sign up is done automatically on sign in.'}{' '}
              <br />
              {type != undefined && type == 'otp'
                ? 'Check your email.'
                : 'By signing up you agree to our'}{' '}
              {type != undefined && type != 'otp' && (
                <>
                  <a
                    href="/terms"
                    target="_blank"
                    style={{
                      color: theme.palette.text.secondary,
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                    }}
                  >
                    Terms of Service
                  </a>
                </>
              )}
              {type === 'message-alert' ? (
                <Box
                  sx={{
                    marginTop: '48px',
                    cursor: 'pointer',
                    opacity: !isFocused ? 1 : 0.4,
                    transition: 'opacity 0.3s',
                  }}
                  onClick={() => {
                    window.location.href = '/'
                  }}
                >
                  <ArrowBack
                    style={{
                      height: '48px',
                      width: '48px',
                      color: alpha(theme.palette.text.primary, 0.25),
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    marginTop: '48px',
                    height: '48px',
                    width: '48px',
                  }}
                ></Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </StyledDiv>
  )
}

function valueTransformer(type: string, value: string) {
  switch (type) {
    case 'email':
      return value.toLowerCase()
    case 'otp':
      return value.toUpperCase()
    default:
      return value
  }
}
