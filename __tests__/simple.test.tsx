import React from 'react'
import { render, screen } from '@testing-library/react'

// Simple test to verify Jest setup
describe('Jest Setup', () => {
  it('should render a simple component', () => {
    const SimpleComponent = () => <div>Hello Jest</div>
    
    render(<SimpleComponent />)
    
    expect(screen.getByText('Hello Jest')).toBeInTheDocument()
  })

  it('should handle basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
    expect(true).toBeTruthy()
  })

  it('should mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})