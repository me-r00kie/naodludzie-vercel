import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trees, User, LogOut, Home, PlusCircle, Menu, X, Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Trees className="w-6 h-6" />
          </div>
          <span className="font-display text-xl font-semibold hidden sm:inline-block">NaOdludzie</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Przeglądaj domki
          </Link>
          <Link 
            to="/dla-wystawcow" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dla wystawców
          </Link>
          <Link 
            to="/kontakt" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Kontakt
          </Link>
          {user?.roles.includes('host') && (
            <>
              <Link 
                to="/host/dashboard" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Panel hosta
              </Link>
              <Link to="/host/add-cabin">
                <Button variant="accent" size="sm">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Dodaj domek
                </Button>
              </Link>
            </>
          )}
          {user?.roles.includes('admin') && (
            <Link 
              to="/admin" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Panel admina
            </Link>
          )}
        </nav>

        {/* User Menu / Auth Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.name && <p className="font-medium">{user.name}</p>}
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">Rola: {user.roles.join(', ')}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-bookings" className="cursor-pointer">
                    <Calendar className="w-4 h-4 mr-2" />
                    Moje rezerwacje
                  </Link>
                </DropdownMenuItem>
                {user.roles.includes('admin') && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Home className="w-4 h-4 mr-2" />
                        Panel admina
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {user.roles.includes('host') && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/host/dashboard" className="cursor-pointer">
                        <Home className="w-4 h-4 mr-2" />
                        Panel hosta
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/host/add-cabin" className="cursor-pointer">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Dodaj domek
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Wyloguj się
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost">Zaloguj się</Button>
              </Link>
              <Link to="/auth?register=true">
                <Button>Zarejestruj się</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden border-t border-border overflow-hidden transition-all duration-300',
          mobileMenuOpen ? 'max-h-96' : 'max-h-0'
        )}
      >
        <nav className="container py-4 space-y-2">
          <Link 
            to="/" 
            className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
            onClick={() => setMobileMenuOpen(false)}
          >
            Przeglądaj domki
          </Link>
          <Link 
            to="/dla-wystawcow" 
            className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
            onClick={() => setMobileMenuOpen(false)}
          >
            Dla wystawców
          </Link>
          <Link 
            to="/kontakt" 
            className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
            onClick={() => setMobileMenuOpen(false)}
          >
            Kontakt
          </Link>
          {user?.roles.includes('admin') && (
            <Link 
              to="/admin" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Panel admina
            </Link>
          )}
          {user?.roles.includes('host') && (
            <>
              <Link 
                to="/host/dashboard" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Panel hosta
              </Link>
              <Link 
                to="/host/add-cabin" 
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dodaj domek
              </Link>
            </>
          )}
          {user && (
            <Link 
              to="/my-bookings" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Moje rezerwacje
            </Link>
          )}
          {!user && (
            <div className="pt-2 space-y-2">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Zaloguj się</Button>
              </Link>
              <Link to="/auth?register=true" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Zarejestruj się</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
