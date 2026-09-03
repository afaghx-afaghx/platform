import { PasswordService } from '../src/core/authentication/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('correct password');
    await expect(service.verify(hash, 'wrong password')).rejects.toThrow('Invalid credentials');
  });
});
