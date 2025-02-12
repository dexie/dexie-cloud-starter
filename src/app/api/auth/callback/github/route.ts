import { NextRequest, NextResponse } from 'next/server'

type GithubUser = {
  login: string
  id: number
  avatar_url: string
  name: string
  company: string
  location: string
  email: string
  notification_email: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  // Dessa variabler kommer från dina miljövariabler
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || ''
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || ''
  const dexieBaseUrl = process.env.NEXT_PUBLIC_DEXIE_CLOUD_DB_URL

  if (!dexieBaseUrl || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Dexie Cloud or GitHub environment variables missing' },
      { status: 500 },
    )
  }

  try {
    // Steg 1: Get an access token from GitHub
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    )
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.json(
        { error: tokenData.error_description },
        { status: 400 },
      )
    }

    const accessToken = tokenData.access_token

    const user: GithubUser = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${accessToken}`,
      },
    }).then((res) => res.json())

    // Steg 2: Get user's email from GitHub
    /*const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${accessToken}`,
      },
    })
    const emails = await emailResponse.json()

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' }, { status: 400 })
    }

    // Choose the primary email or the first one
    const primaryEmailObj =
      emails.find(
        (emailObj: { primary: boolean; email: string }) => emailObj.primary,
      ) || emails[0]
    const email = primaryEmailObj.email
    */

    // Steg 3: Get an OTP from Dexie Cloud
    const dexieResponse = await fetch(`${dexieBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        otp: true,
        client_id: process.env.DEXIE_CLOUD_CLIENT_ID,
        client_secret: process.env.DEXIE_CLOUD_CLIENT_SECRET,
        scopes: ['ACCESS_DB'],
        emal_verified: true,
        claims: {
          sub: user.email,
          email: user.email,
          name: user.name,
        },
        data: {
          avatar_url: user.avatar_url,
        },
      }),
    })

    if (!dexieResponse.ok) {
      const errorData = await dexieResponse.json()
      return NextResponse.json(
        { error: errorData.error || 'Dexie login failed' },
        { status: dexieResponse.status },
      )
    }

    const otpData = await dexieResponse.json()

    if (!otpData.otp_id || !otpData.otp) {
      return NextResponse.json(
        { error: 'No OTP data received from Dexie Cloud' },
        { status: 500 },
      )
    }

    // Redirect to the OTP page with the email and OTP for automatic login
    const currentUrl = new URL(request.url)
    const redirectUrl = `${currentUrl.origin}/?email=${user.email}&otp=${otpData.otp}&otpId=${otpData.otp_id}`

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error in GitHub callback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
